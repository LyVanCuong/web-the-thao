const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Cấu hình kết nối SQL Server
const config = {
    user: 'sa',
    password: '123',
    server: 'DESKTOP-73GN3EA\\CUONGSIUCUTE',
    database: 'TimBanChoi',
    port: 1433,
    options: {
        encrypt: false, // true nếu dùng Azure
        trustServerCertificate: true,
    },
};

// Kết nối cơ sở dữ liệu
sql.connect(config).then(pool => {
    console.log('✅ Kết nối SQL Server thành công');

    // API: Đăng nhập
    app.post('/api/dangnhap', async (req, res) => {
        const { tendangnhap, matkhau } = req.body;
        try {
            const result = await pool.request()
                .input('tendangnhap', sql.VarChar, tendangnhap)
                .input('matkhau', sql.VarChar, matkhau)
                .query('SELECT * FROM TK WHERE Tendangnhap = @tendangnhap AND MK = @matkhau');
            if (result.recordset.length > 0) {
                res.json({ success: true, user: result.recordset[0] });
            } else {
                res.json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
            }
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // API: Đăng ký
   app.post('/api/dangki', async (req, res) => {
    const { tendangnhap, matkhau, hoten, tuoi, gioitinh, ngaysinh, sdt, gmail, anhdaidien } = req.body;
    try {
        // Bước 1: Thêm tài khoản vào bảng TK
        await pool.request()
            .input('tendangnhap', sql.VarChar, tendangnhap)
            .input('matkhau', sql.VarChar, matkhau)
            .query('INSERT INTO TK (Tendangnhap, MK) VALUES (@tendangnhap, @matkhau)');

        // Bước 2: Lấy ID_DN mới thêm
        const result = await pool.request()
            .input('tendangnhap', sql.VarChar, tendangnhap)
            .query('SELECT ID_DN FROM TK WHERE Tendangnhap = @tendangnhap');

        const id_dn = result.recordset[0].ID_DN;

        // Bước 3: Thêm thông tin người chơi (liên kết với ID_DN)
       await pool.request()
    .input('id_dn', sql.Int, id_dn)
    .input('hoten', sql.NVarChar, hoten)
    .input('tuoi', sql.Int, tuoi)
    .input('gioitinh', sql.NVarChar, gioitinh || null)
    .input('ngaysinh', sql.Date, ngaysinh ? new Date(ngaysinh) : null)
    .input('sdt', sql.VarChar, sdt || null)
    .input('gmail', sql.VarChar, gmail || null)
    .input('anhdaidien', sql.VarChar, anhdaidien || null)
    .query(`INSERT INTO thong_tin_nguoi_choi 
            (ID_DN, Ho_ten, Tuoi, Gioi_tinh, Ngay_sinh, Sdt, Gmail, Anh_dai_dien) 
            VALUES (@id_dn, @hoten, @tuoi, @gioitinh, @ngaysinh, @sdt, @gmail, @anhdaidien)`);


        res.json({ success: true });
    } catch (err) {
        console.error('❌ Lỗi khi đăng ký:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Lấy thông tin cá nhân
app.get('/api/profile/:id_dn', async (req, res) => {
    const id_dn = parseInt(req.params.id_dn);
    try {
        const result = await pool.request()
            .input('id_dn', sql.Int, id_dn)
            .query('SELECT * FROM thong_tin_nguoi_choi WHERE ID_DN = @id_dn');

        if (result.recordset.length > 0) {
            res.json({ success: true, data: result.recordset[0] });
        } else {
            res.json({ success: false, message: 'Không tìm thấy người dùng' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

    // Thêm các API khác như tạo trận, tìm trận, tham gia, đánh giá...

}).catch(err => {
    console.error('❌ Lỗi kết nối SQL Server:', err);
});

// Chạy server
app.listen(port, () => {
    console.log(`🚀 Server chạy tại http://localhost:${port}`);
});
