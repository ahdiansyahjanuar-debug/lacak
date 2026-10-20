# SafeTrack Web (versi izin satu kali + peta)

## Jalankan
Butuh Node.js 18+. Tanpa `npm install`.

    node server.js

Buka http://localhost:3000. Untuk dipakai di HP orang lain, deploy ke server HTTPS
(Geolocation di HP hanya jalan di HTTPS atau localhost).

## Alur
1. Kedua orang daftar dengan nama dan nomor HP.
2. A memasukkan nomor B lalu menekan **Minta izin** (bisa kirim pengingat via WhatsApp).
3. B membuka tab **Izin masuk** lalu menekan **Izinkan**. Izin ini disimpan, jadi A bisa melacak lagi tanpa minta izin ulang.
4. B bisa **Cabut izin** kapan saja. Setelah dicabut, A harus minta izin lagi.

## Batasan
- Lokasi B terkirim selama halaman SafeTrack terbuka di HP B (batasan browser).
- Nomor HP belum diverifikasi OTP. Untuk produksi tambahkan OTP SMS/WhatsApp dan HTTPS.
- Data disimpan di `data.json`.
