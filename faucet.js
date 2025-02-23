const axios = require('axios');
const fs = require('fs');

// Konfigurasi
const FAUCET_URL = "https://rome.testnet.romeprotocol.xyz/airdrop";
const CAPTCHA_SITEKEY = "6Leq7o0qAAAAAKC0I6TptEAo6QxUcbv7_WFA1Ly9";
const API_KEY_2CAPTCHA = "apikeymu"; // Ganti dengan API Key 2Captcha
const COOLDOWN_HOURS = 6; // Cooldown klaim 6 jam
const WALLET_FILE = "data.txt";

// Baca daftar wallet dari file
function getWallets() {
    try {
        return fs.readFileSync(WALLET_FILE, 'utf8').split('\n').map(w => w.trim()).filter(w => w);
    } catch (err) {
        console.error("? Gagal membaca data.txt:", err);
        return [];
    }
}

// Solve CAPTCHA menggunakan 2Captcha
async function solveCaptcha() {
    try {
        console.log("?? Mengirim CAPTCHA ke 2Captcha...");
        let res = await axios.get(`http://2captcha.com/in.php?key=${API_KEY_2CAPTCHA}&method=userrecaptcha&googlekey=${CAPTCHA_SITEKEY}&pageurl=https://rome.testnet.romeprotocol.xyz/request_airdrop&json=1`);
        let requestId = res.data.request;

        console.log("? Menunggu hasil CAPTCHA...");
        await new Promise(resolve => setTimeout(resolve, 20000));

        while (true) {
            res = await axios.get(`http://2captcha.com/res.php?key=${API_KEY_2CAPTCHA}&action=get&id=${requestId}&json=1`);
            if (res.data.status === 1) {
                console.log("? CAPTCHA berhasil diselesaikan!");
                return res.data.request;
            }
            console.log("? Menunggu 5 detik...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (error) {
        console.error("? Gagal solve CAPTCHA:", error);
        return null;
    }
}

// Klaim airdrop untuk satu wallet
async function claimAirdrop(wallet) {
    try {
        console.log(`?? Klaim airdrop untuk ${wallet}...`);
        const captchaResponse = await solveCaptcha();
        if (!captchaResponse) {
            console.log(`? Gagal mendapatkan CAPTCHA untuk ${wallet}, skip akun ini.`);
            return;
        }

        const response = await axios.post(FAUCET_URL, {
            recipientAddr: wallet,
            amount: "100",
            captchaResponse: captchaResponse
        }, {
            headers: {
                "Content-Type": "application/json",
                "Origin": "https://rome.testnet.romeprotocol.xyz",
                "Referer": "https://rome.testnet.romeprotocol.xyz/request_airdrop"
            }
        });

        // Cek respons dari server
        if (response.data.message && response.data.message.includes("already claimed")) {
            console.log(`? ${wallet} sudah klaim, lanjut ke akun berikutnya...`);
        } else {
            console.log(`?? Sukses klaim untuk ${wallet}:`, response.data);
        }
    } catch (error) {
        console.error(`? Gagal klaim untuk ${wallet}:`, error.response ? error.response.data : error.message);
    }
}

// Looping klaim semua akun setiap 6 jam
async function runBot() {
    while (true) {
        console.log("\n==============================");
        console.log("?? Memulai klaim faucet Rome Testnet");
        console.log("==============================\n");

        const wallets = getWallets();
        if (wallets.length === 0) {
            console.log("? Tidak ada wallet dalam data.txt!");
            return;
        }

        for (const wallet of wallets) {
            await claimAirdrop(wallet);
        }

        console.log(`? Semua akun selesai diproses.`);
        console.log(`? Menunggu ${COOLDOWN_HOURS} jam sebelum klaim ulang...\n`);
        await new Promise(resolve => setTimeout(resolve, COOLDOWN_HOURS * 60 * 60 * 1000)); // Cooldown 6 jam
    }
}

// Jalankan bot
runBot();
