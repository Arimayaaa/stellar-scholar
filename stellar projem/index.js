const express = require('express');
const path = require('path');
const StellarSdk = require('@stellar/stellar-sdk');
const app = express();
const port = 3000;

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

app.use(express.json());
app.use(express.static('.'));

// --- GÜVENLİK AYARLARI ---
const gonderenSecretKey = 'SCSFZQLMJES62IA6DITSQX5MU7JBCKAJEYEQKZWMVOD6JIWS5JZF6N74'; 

app.post('/bagis-yap', async (req, res) => {
    const { miktar, memo } = req.body;
    
    // ADRESİ TEMİZLEYİCİDEN GEÇİRİYORUZ (Hata payını yok etmek için)
    let hedefAdres = 'GBVGHDPCZNEKII5PQFYWUYLC6QJXFGWGUDQJLUTRDVIFWVISHR42GC6B';
    hedefAdres = hedefAdres.trim().replace(/\s/g, ''); // Tüm gizli boşlukları siler

    try {
        const kaynakAnahtar = StellarSdk.Keypair.fromSecret(gonderenSecretKey);
        const gonderenHesap = await server.loadAccount(kaynakAnahtar.publicKey());

        const islem = new StellarSdk.TransactionBuilder(gonderenHesap, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarSdk.Networks.TESTNET,
        })
        .addOperation(StellarSdk.Operation.payment({
            destination: hedefAdres,
            asset: StellarSdk.Asset.native(),
            amount: miktar.toString(),
        }))
        .addMemo(StellarSdk.Memo.text(memo || "Stellar Scholar"))
        .setTimeout(30)
        .build();

        islem.sign(kaynakAnahtar);
        const sonuc = await server.submitTransaction(islem);
        
        res.json({ success: true, hash: sonuc.hash });
    } catch (e) {
        console.error("Hata Detayı:", e);
        res.status(500).json({ success: false, error: "Blockchain Hatası: " + e.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Sistem Başlatıldı: http://localhost:${port}`);
});