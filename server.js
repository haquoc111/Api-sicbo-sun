const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

const API_URL = "https://afterwards-motels-honors-vendors.trycloudflare.com/api/sunsicbo";

app.use(cors());

const history = [];

// ==========================
// XÁC ĐỊNH TÀI / XỈU
// ==========================
function getTaiXiu(total) {
    return total >= 11 ? "tài" : "xỉu";
}

// ==========================
// RANDOM 3 VỊ
// ==========================
function generateVi(result) {

    const numbers = [];

    while (numbers.length < 3) {

        let num;

        if (result === "tài") {

            // 11 -> 18
            num = Math.floor(Math.random() * 8) + 11;

        } else {

            // 3 -> 10
            num = Math.floor(Math.random() * 8) + 3;
        }

        if (!numbers.includes(num)) {
            numbers.push(num);
        }
    }

    return numbers.join(" ");
}

// ==========================
// XÚC XẮC BẢO
// ==========================
function generateViBao(result) {

    if (result === "tài") {
        return "6-6-6";
    }

    return "3-3-3";
}

// ==========================
// PHÂN TÍCH CẦU
// ==========================
function analyzeBridge() {

    if (history.length < 2) {

        return {
            duDoan: "tài",
            doTinCay: "50%"
        };
    }

    const recent = history.slice(-6).map(i => i.ket_qua);

    // Đếm cầu bệt
    let streak = 1;

    for (let i = recent.length - 1; i > 0; i--) {

        if (recent[i] === recent[i - 1]) {
            streak++;
        } else {
            break;
        }
    }

    const current = recent[recent.length - 1];

    let duDoan = current;

    let doTinCay = 70;

    // ==========================
    // CẦU BỆT
    // ==========================
    if (streak >= 3) {

        duDoan = current;

        doTinCay = Math.min(100, 70 + streak * 5);

    } else {

        // ==========================
        // CẦU 1 - 1
        // ==========================
        const pattern = recent.slice(-4).join("-");

        if (
            pattern === "tài-xỉu-tài-xỉu" ||
            pattern === "xỉu-tài-xỉu-tài"
        ) {

            duDoan = current === "tài"
                ? "xỉu"
                : "tài";

            doTinCay = 85;

        } else {

            // ==========================
            // THỐNG KÊ
            // ==========================
            const tai = recent.filter(i => i === "tài").length;

            const xiu = recent.filter(i => i === "xỉu").length;

            duDoan = tai >= xiu
                ? "tài"
                : "xỉu";

            doTinCay = 75;
        }
    }

    return {
        duDoan,
        doTinCay: doTinCay + "%"
    };
}

// ==========================
// API DỰ ĐOÁN
// ==========================
app.get("/api/predict", async (req, res) => {

    try {

        const response = await axios.get(API_URL);

        const data = response.data;

        const phien =
            data?.session ||
            data?.phien ||
            Date.now();

        const dice =
            data?.dice ||
            data?.xuc_xac ||
            [1, 1, 1];

        const d1 = Number(dice[0]);

        const d2 = Number(dice[1]);

        const d3 = Number(dice[2]);

        const total = d1 + d2 + d3;

        const ket_qua = getTaiXiu(total);

        const currentData = {

            id: "Ha Quoc",

            phien,

            ket_qua,

            xuc_xac: `${d1}-${d2}-${d3}`,

            tong: total,

            time: new Date().toLocaleString("vi-VN")
        };

        // Không lưu trùng phiên
        const exists = history.find(
            i => i.phien == phien
        );

        if (!exists) {

            history.push(currentData);

            // Giữ tối đa 100 phiên
            if (history.length > 100) {
                history.shift();
            }
        }

        // Phân tích cầu
        const prediction = analyzeBridge();

        const result = {

            Id: "Ha Quoc",

            Phien: currentData.phien,

            Ket_qua: currentData.ket_qua,

            Xuc_xac: currentData.xuc_xac,

            Tong: currentData.tong,

            Phien_nay:
                Number(currentData.phien) + 1,

            Du_doan: prediction.duDoan,

            Vi: generateVi(
                prediction.duDoan
            ),

            "Độ_tin_cậy":
                prediction.doTinCay,

            Du_doan_bao: "100%",

            Vi_bao: generateViBao(
                prediction.duDoan
            ),

            Lich_su:
                history.slice(-20).reverse()
        };

        res.json(result);

    } catch (error) {

        res.status(500).json({

            error: true,

            message: error.message
        });
    }
});

// ==========================
// HOME
// ==========================
app.get("/", (req, res) => {

    res.send(
        "Sicbo Prediction API Running..."
    );
});

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );
});