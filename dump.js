const express = require('express');
const cors = require('cors');
const Datastore = require('nedb-promises');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ตั้งค่าฐานข้อมูลจำลอง (จะสร้างไฟล์ users.db ขึ้นมาอัตโนมัติ)
const db = new Datastore({ filename: 'users.db', autoload: true });

app.use(cors());
app.use(express.json());

// ข้อมูลจำลองสำหรับทดสอบ (จะยอมใส่เข้า Database ถ้ายิงครั้งแรกและตารางว่าง)
async function seedDatabase() {
    const count = await db.count({});
    if (count === 0) {
        await db.insert([
            { username: 'player_one', hwid: '9A8B-7C6D', status: 'active', license: 'HYZEN-1111' },
            { username: 'player_two', hwid: '1A2B-3C4D', status: 'banned', license: 'GHOST-2222' }
        ]);
        console.log('🌱 Seeded initial backup data.');
    }
}
seedDatabase();

// 🔒 Middleware ตรวจสอบสิทธิ์ (Admin Token)
const authAdmin = (req, res, next) => {
    const adminToken = req.headers['authorization'];
    const SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'MY_SUPER_SECRET_KEY_123';

    if (!adminToken || adminToken !== SECRET_KEY) {
        return res.status(403).json({ success: false, message: 'Unauthorized access!' });
    }
    next();
};

// 📌 [GET] API สำหรับดัมพ์ข้อมูลออกไปใช้งาน (ใช้ได้ทั้ง Web และ Discord Bot)
app.get('/api/dump', authAdmin, async (req, res) => {
    try {
        const queryFilter = {};
        
        // ถ้าระบุสถานะมา เช่น /api/dump?status=banned ก็จะดึงเฉพาะกลุ่มนั้น
        if (req.query.status) {
            queryFilter.status = req.query.status;
        }

        const users = await db.find(queryFilter);
        
        res.json({
            success: true,
            exported_at: new Date().toISOString(),
            total_records: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Dump API Server is running on port ${PORT}`);
});
