🌌 Stellar Scholar - Project Documentation

Stellar Scholar is a blockchain-integrated academic tracking and data analysis prototype developed for the Stellar Network. The project leverages decentralized ledger technology to ensure academic integrity and provide transparent data visualization for educational metrics.

🚀 Key Features

Blockchain Integration: Secure data logging on the Stellar network to prevent academic record tampering.

Data Analysis & Visualization: Advanced processing of academic datasets with intuitive graphical representations.

Modular Design: Scalable architecture suitable for integration into university management systems.

Soroban Smart Contract: Academic donation and record data can be written to a Soroban smart contract on Stellar Testnet.

🛰️ Soroban Smart Contract

Network: Stellar Testnet

Contract Address: `CDRJNNJIR5EV2HECV5LSN7JBZTWKNL4KWXQXZED25KMAVRHYHD6NJANB`

Contract Source: `contracts/stellar-scholar/src/lib.rs`

⛓️ Transaction Example (Stellar Network)

Below is a sample JSON structure representing an academic credential verification on the Stellar Testnet. This operation anchors a student's project completion hash onto the ledger using the Manage Data operation.

```json
{
  "memo": "StellarScholar_Cert_2026",
  "source_account": "GBVGHDPCZNEKII5PQFYWUYLC6QJXFGWGUDQJLUTRDVIFWVISHR42GC6B",
  "fee": "100",
  "sequence": "123456789",
  "operations": [
    {
      "type": "manageData",
      "name": "Project_Hash",
      "value": "b5a9...4e12"
    },
    {
      "type": "manageData",
      "name": "Student_ID",
      "value": "BOZOK_2027_EYLUL"
    }
  ],
  "network_passphrase": "Test SDF Network ; September 2015"
}
```

<img width="1918" height="936" alt="Ekran görüntüsü 2026-05-03 103234" src="https://github.com/user-attachments/assets/2dcb9515-cd89-4b1b-9e21-f07a0ee87990" />
<img width="1906" height="830" alt="Ekran görüntüsü 2026-05-03 103301" src="https://github.com/user-attachments/assets/413f4298-78e8-440b-ae2d-4d4360a37653" />
<img width="1423" height="721" alt="Ekran görüntüsü 2026-05-03 103124" src="https://github.com/user-attachments/assets/5ab2f936-3c5d-4a82-80cb-273167e31574" />
<img width="1492" height="888" alt="Ekran görüntüsü 2026-05-03 103113" src="https://github.com/user-attachments/assets/c9795255-d408-49b9-be15-7bcdd0853d0a" />
