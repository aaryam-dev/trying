const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs').promises;
const JSZip = require('jszip');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const publicUploadsPath = path.join(__dirname, 'public', 'uploads');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', async (req, res) => {
    try {
        const { date, files } = req.body;

        if (!date || !files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'Invalid request parameters.' });
        }

        const uploadPath = path.join(publicUploadsPath, date);

        if (!fs.existsSync(uploadPath)) {
            await fs.mkdir(uploadPath);
        }

        await Promise.all(files.map(async (file) => {
            const filePath = path.join(uploadPath, file.name);
            await fs.writeFile(filePath, Buffer.from(file.content, 'base64'));
        }));

        res.json({ success: true });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.get('/download/:selectedDate', async (req, res) => {
    try {
        const selectedDate = req.params.selectedDate;
        const uploadPath = path.join(publicUploadsPath, selectedDate);

        if (!fs.existsSync(uploadPath)) {
            return res.status(404).json({ error: 'Files not found for the selected date.' });
        }

        const files = await fs.readdir(uploadPath);
        const zip = new JSZip();

        await Promise.all(files.map(async (file) => {
            const filePath = path.join(uploadPath, file);
            zip.file(file, await fs.readFile(filePath));
        }));

        const zipData = await zip.generateAsync({ type: 'nodebuffer' });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=notes_${selectedDate}.zip`);
        res.setHeader('Content-Length', zipData.length);
        res.status(200).end(zipData, 'binary');
    } catch (error) {
        console.error('Error generating or sending zip file:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
