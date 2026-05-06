const sonucDiv = document.getElementById("sonuc");
const adresInput = document.getElementById("adres");
const sistemDurumu = document.getElementById("sistemDurumu");
const buton = document.getElementById("mainBtn");

window.addEventListener("DOMContentLoaded", () => yukleDurum());
window.bagisYap = bagisYap;

async function yukleDurum(secenekler = {}) {
    if (!secenekler.sessiz) {
        sonucYaz("info", "Sunucu ve kontrat bilgileri kontrol ediliyor...");
    }

    try {
        const response = await fetch("/api/status");
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        adresInput.value = data.donationDestination;

        if (data.contractConfigured) {
            sistemDurumu.innerHTML = `
                Testnet bagli.<br>
                Kontrat ID: <strong>${data.contractId}</strong><br>
                Toplam bagis: <strong>${data.summary?.totalAmountXlm ?? "0.0000000"} XLM</strong><br>
                Toplam islem: <strong>${data.summary?.totalCount ?? 0}</strong>
            `;
            if (!secenekler.sessiz) {
                sonucYaz("info", "Sistem hazir. Bagis hem cuzdana gidecek hem de Soroban kontratina kaydedilecek.");
            }
        } else {
            sistemDurumu.innerHTML = `
                Testnet hazir, fakat Soroban kontrati deploy edilmemis.<br>
                README icindeki deploy adimlarini uygulayip <strong>SOROBAN_CONTRACT_ID</strong> tanimlamaniz gerekiyor.
            `;
            if (!secenekler.sessiz) {
                sonucYaz("error", "Kontrat deploy edilmeden zincire kayit acilamaz.");
            }
        }
    } catch (error) {
        sonucYaz("error", `Durum okunamadi: ${error.message}`);
        sistemDurumu.textContent = "Durum servisi okunamadi.";
    }
}

async function bagisYap() {
    const miktar = document.getElementById("miktar").value;
    const memo = document.getElementById("memo").value;

    buton.disabled = true;
    sonucYaz("info", "Odeme ve Soroban kaydi testnet agina gonderiliyor...");

    try {
        const response = await fetch("/bagis-yap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ miktar, memo })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error);
        }

        sonucDiv.innerHTML = `
            <strong>Bagis basarili.</strong><br>
            Donation ID: <strong>#${data.donationId}</strong><br>
            <a href="https://stellar.expert/explorer/testnet/tx/${data.paymentTxHash}" target="_blank" class="explorer-btn">Odeme islemi</a>
            <a href="https://stellar.expert/explorer/testnet/tx/${data.contractTxHash}" target="_blank" class="explorer-btn">Kontrat islemi</a>
        `;
        sonucDiv.className = "status success";
        await yukleDurum({ sessiz: true });
    } catch (error) {
        sonucYaz("error", `Hata: ${error.message}`);
    } finally {
        buton.disabled = false;
    }
}

function sonucYaz(tip, mesaj) {
    sonucDiv.textContent = mesaj;
    sonucDiv.className = `status ${tip}`;
}
