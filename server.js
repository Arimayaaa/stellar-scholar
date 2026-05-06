import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import express from "express";
import {
  Address,
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative
} from "@stellar/stellar-sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

const networkPassphrase =
  process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");
const rpcServer = new rpc.Server(
  process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org"
);
const donationDestination =
  process.env.DONATION_DESTINATION ||
  "GBVGHDPCZNEKII5PQFYWUYLC6QJXFGWGUDQJLUTRDVIFWVISHR42GC6B";
const contractId = process.env.SOROBAN_CONTRACT_ID || "";

app.use(express.json());
app.use(express.static(path.join(__dirname, "stellar projem")));

app.get("/api/status", async (_req, res) => {
  try {
    let summary = null;

    if (contractId) {
      summary = await getContractSummary();
    }

    res.json({
      success: true,
      network: "testnet",
      contractConfigured: Boolean(contractId),
      contractId: contractId || null,
      donationDestination,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: formatError(error)
    });
  }
});

app.post("/bagis-yap", async (req, res) => {
  const { miktar, memo } = req.body ?? {};

  try {
    validateEnvironment();

    const amount = normalizeAmount(miktar);
    const cleanMemo = normalizeMemo(memo);
    const sourceKeypair = Keypair.fromSecret(process.env.STELLAR_SECRET_KEY);

    const payment = await submitPaymentTransaction({
      sourceKeypair,
      destination: donationDestination,
      amount,
      memo: cleanMemo
    });

    const contractWrite = await submitDonationContractTransaction({
      sourceKeypair,
      destination: donationDestination,
      amount,
      memo: cleanMemo
    });

    res.json({
      success: true,
      donationId: contractWrite.donationId,
      paymentTxHash: payment.hash,
      contractTxHash: contractWrite.hash,
      contractId
    });
  } catch (error) {
    console.error("İşlem hatası:", error);
    res.status(500).json({
      success: false,
      error: formatError(error)
    });
  }
});

async function submitPaymentTransaction({ sourceKeypair, destination, amount, memo }) {
  const sourceAccount = await horizonServer.loadAccount(sourceKeypair.publicKey());
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount: amount.display
      })
    )
    .addMemo(Memo.text(memo.paymentMemo))
    .setTimeout(30)
    .build();

  transaction.sign(sourceKeypair);
  return horizonServer.submitTransaction(transaction);
}

async function submitDonationContractTransaction({
  sourceKeypair,
  destination,
  amount,
  memo
}) {
  const sourceAccount = await rpcServer.getAccount(sourceKeypair.publicKey());
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: "record_donation",
        args: [
          new Address(sourceKeypair.publicKey()).toScVal(),
          new Address(destination).toScVal(),
          nativeToScVal(amount.stroops, { type: "i128" }),
          nativeToScVal(memo.contractMemo)
        ]
      })
    )
    .setTimeout(30)
    .build();

  const prepared = await rpcServer.prepareTransaction(transaction);
  prepared.sign(sourceKeypair);

  const submission = await rpcServer.sendTransaction(prepared);
  if (!["PENDING", "DUPLICATE"].includes(submission.status)) {
    throw new Error("Soroban islemi aga kabul edilmedi.");
  }

  const finalStatus = await rpcServer.pollTransaction(submission.hash, {
    attempts: 20,
    sleepStrategy: (attempt) => Math.min(500 * attempt, 2000)
  });

  if (finalStatus.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("Soroban islemi zincirde basarisiz oldu.");
  }

  return {
    hash: finalStatus.txHash,
    donationId: Number(scValToNative(finalStatus.returnValue))
  };
}

async function getContractSummary() {
  const sourcePublicKey = process.env.STELLAR_SECRET_KEY
    ? Keypair.fromSecret(process.env.STELLAR_SECRET_KEY).publicKey()
    : donationDestination;

  const sourceAccount = await rpcServer.getAccount(sourcePublicKey);
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: "get_summary",
        args: []
      })
    )
    .setTimeout(30)
    .build();

  const simulation = await rpcServer.simulateTransaction(transaction);
  if ("error" in simulation) {
    throw new Error(simulation.error);
  }

  const [totalCount, totalAmountStroops] = scValToNative(simulation.result.retval);
  return {
    totalCount,
    totalAmountXlm: formatStroops(BigInt(totalAmountStroops))
  };
}

function validateEnvironment() {
  if (!process.env.STELLAR_SECRET_KEY) {
    throw new Error("`STELLAR_SECRET_KEY` tanımlı değil.");
  }

  if (!contractId) {
    throw new Error(
      "Soroban kontratı henüz deploy edilmemiş. `SOROBAN_CONTRACT_ID` girilmeden bağış kaydı zincire yazılamaz."
    );
  }
}

function normalizeAmount(rawAmount) {
  const normalized = String(rawAmount ?? "")
    .trim()
    .replace(",", ".");

  if (!/^\d+(\.\d{1,7})?$/.test(normalized)) {
    throw new Error("Geçerli bir XLM miktarı girin.");
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const stroops = BigInt(wholePart) * 10_000_000n +
    BigInt(fractionalPart.padEnd(7, "0"));

  if (stroops <= 0n) {
    throw new Error("Geçerli bir XLM miktarı girin.");
  }

  return {
    display: `${wholePart}.${fractionalPart.padEnd(7, "0")}`,
    stroops
  };
}

function normalizeMemo(rawMemo) {
  const value = String(rawMemo ?? "").trim() || "Stellar Scholar bagisi";

  return {
    contractMemo: value.slice(0, 120),
    paymentMemo: value.slice(0, 28)
  };
}

function formatStroops(stroops) {
  return (Number(stroops) / 10_000_000).toFixed(7);
}

function formatError(error) {
  return error instanceof Error ? error.message : "Bilinmeyen hata";
}

app.listen(port, () => {
  console.log(`Stellar Scholar testnet sunucusu hazir: http://localhost:${port}`);
});
