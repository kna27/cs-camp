const express = require("express");
const multer = require("multer");
const fsExtra = require('fs-extra');
const Handlebars = require("hbs");
const fs = require("fs");
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));
app.use('/scavenger_hunt', express.static(path.join(__dirname, 'scavenger_hunt')));

const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const dest = path.join(__dirname, 'scavenger_hunt', req.query.family);
        try {
            await fsExtra.ensureDir(dest);
            cb(null, dest);
        } catch (error) {
            cb(error, null);
        }
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        const newFilename = `${baseName}-${timestamp}${extension}`;
        cb(null, newFilename);
    }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getData = () => {
    return JSON.parse(fs.readFileSync("data.json"));
}

const updateData = (data) => {
    fs.writeFileSync("data.json", JSON.stringify(data));
}

Handlebars.registerPartials(__dirname + "/views/partials/", (error) => { if (error) throw error });
app.set("view engine", "hbs");


ADMIN_PASSWORD = getData().admin_pw;

app.get('/', (req, res) => {
    return res.render("index");
});

app.post('/login', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    if (username == "admin" && password == ADMIN_PASSWORD) {
        return res.render("admin", { families: getData().families });
    }
    
    let data = getData();
    let family = data.families.find((family) => family.name == username);
    if (family && family.password == password) {
        let images;
        try {
            let imagesDir = path.join(__dirname, 'scavenger_hunt', username);
            images = await fsExtra.readdir(imagesDir);
        } catch (error) {
            console.error('Error reading files:', error);
            return res.status(500).send('Server error');
        }
        return res.render("family", { family: family, images: images });
    }
    return res.redirect("/");
});

app.post("/admin", (req, res) => {
    let data = getData();
    data.families.forEach((family) => {
        if (req.body[`points_${family.name}`]) {
            family.points = parseInt(req.body[`points_${family.name}`]);
        }
    });
    updateData(data);
    return res.render("admin", { families: getData().families });
});

app.post("/family", upload.array('scavenger_hunt'), async (req, res) => {
    let familyName = req.query.family;
    let imagesDir = path.join(__dirname, 'scavenger_hunt', familyName);
    let images;
    try {
        images = await fsExtra.readdir(imagesDir);
    } catch (error) {
        console.error('Error reading files:', error);
        return res.status(500).send('Server error');
    }
    let data = getData();
    let family = data.families.find(f => f.name === familyName);

    if (!family) {
        return res.redirect("/");
    }

    res.render("family", { family: family, images: images });
});

app.get("/api/leaderboard", (req, res) => {
    let points = {};
    let data = getData();
    data.families.forEach((family) => {
        points[family.name] = family.points;
    });
    points = Object.fromEntries(Object.entries(points).sort(([, a], [, b]) => b - a));
    return res.json(points);
});

app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
});
