import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import {
  Address,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  rpc
} from "@stellar/stellar-sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const wasmPath = path.resolve(
  projectRoot,
  "target/wasm32v1-none/release/stellar_scholar.wasm"
);

if (!process.env.STELLAR_SECRET_KEY) {
  throw new Error("`STELLAR_SECRET_KEY` gerekli.");
}

if (!fs.existsSync(wasmPath)) {
  throw new Error(
    `WASM dosyasi bulunamadi: ${wasmPath}. Once \`stellar contract build\` veya \`cargo build --target wasm32v1-none --release\` calistirin.`
  );
}

const rpcUrl = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const networkPassphrase =
  process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

const server = new rpc.Server(rpcUrl);
const sourceKeypair = Keypair.fromSecret(process.env.STELLAR_SECRET_KEY);

const wasmBytes = fs.readFileSync(wasmPath);

const uploadResult = await submitOperation(
  Operation.uploadContractWasm({ wasm: wasmBytes })
);

const deployResult = await submitOperation(
  Operation.createCustomContract({
    wasmHash: uploadResult.returnValue.bytes(),
    address: Address.fromString(sourceKeypair.publicKey()),
    salt: randomBytes(32)
  })
);

const contractAddress = StrKey.encodeContract(
  Address.fromScAddress(deployResult.returnValue.address()).toBuffer()
);

await submitTransaction(
  new TransactionBuilder(await server.getAccount(sourceKeypair.publicKey()), {
    fee: "100",
    networkPassphrase
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractAddress,
        function: "init",
        args: [Address.fromString(sourceKeypair.publicKey()).toScVal()]
      })
    )
    .setTimeout(30)
    .build()
);

const wasmHashBytes = uploadResult.returnValue.bytes();
console.log("Wasm hash:", Buffer.from(wasmHashBytes).toString("hex"));
console.log("Contract ID:", contractAddress);

async function submitOperation(operation) {
  const account = await server.getAccount(sourceKeypair.publicKey());
  const transaction = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  return submitTransaction(transaction);
}

async function submitTransaction(transaction) {
  const prepared = await server.prepareTransaction(transaction);
  prepared.sign(sourceKeypair);

  const submitted = await server.sendTransaction(prepared);
  if (!["PENDING", "DUPLICATE"].includes(submitted.status)) {
    throw new Error("Islem RPC tarafinda beklemeye alinmadi.");
  }

  const finalStatus = await server.pollTransaction(submitted.hash, {
    attempts: 20,
    sleepStrategy: (attempt) => Math.min(500 * attempt, 2000)
  });

  if (finalStatus.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("Islem zincirde basarisiz oldu.");
  }

  return finalStatus;
}
