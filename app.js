const express = require("express");
const multer = require("multer");
const Handlebars = require("hbs");
const fsExtra = require("fs-extra");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const getData = () => JSON.parse(fs.readFileSync("data.json"));

const updateData = (data) => fs.writeFileSync("data.json", JSON.stringify(data));

const consoleError = (message) => {
    console.error("\x1b[31m%s\x1b[0m", `ERROR: ${message}`);
    process.exit(1);
}

const consoleWarn = (message) => {
    console.warn("\x1b[33m%s\x1b[0m", `WARNING: ${message}`);
}

// Startup checks
if (!fs.existsSync("data.json")) {
    consoleError("data.json does not exist");
}
try {
    JSON.parse(fs.readFileSync("data.json"));
} catch (error) {
    consoleError("data.json is not valid JSON");
}
if (!getData().admin_pw) {
    consoleError("Admin password is not set");
}
if (!getData().families || getData().families.length == 0) {
    consoleWarn("No families are set, if this is intentional, ignore this");
}
if (!getData().schedule || Object.keys(getData().schedule).length === 0) {
    consoleWarn("Schedule does not exist or is empty, if this is intentional, ignore this");
}

const getFamilyImages = (familyName) => {
    const familyDir = path.join(__dirname, "scavenger_hunt", familyName);
    try {
        return fs.readdirSync(familyDir);
    } catch (error) {
        console.error(`Error reading directory for ${familyName}:`, error);
        return [];
    }
}

Handlebars.registerHelper('eq', function (arg1, arg2) {
    return (arg1 == arg2);
});

// Create scavenger hunt directories for each family
let families = getData().families;
if (families) {
    families.forEach(family => {
        const directoryPath = path.join(__dirname, "scavenger_hunt", family.name);
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }
    });
}

const HINT_IMAGE_DIR = path.join(__dirname, "scavenger_hunt", "__hints");
if (!fs.existsSync(HINT_IMAGE_DIR)) {
    fs.mkdirSync(HINT_IMAGE_DIR, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const dest = path.join(__dirname, "scavenger_hunt", req.query.family);
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

const hintStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, HINT_IMAGE_DIR);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        const newFilename = `${baseName}-${timestamp}${extension}`;
        cb(null, newFilename);
    }
});

const hintUpload = multer({ storage: hintStorage });

// Express setup
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname + "/public"));
app.use("/scavenger_hunt", express.static(path.join(__dirname, "scavenger_hunt")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "hbs");


const ADMIN_PASSWORD = getData().admin_pw;

app.get("/", (req, res) => {
    let data = getData();
    if (data.scav_hunt_hints_visible) {
        data.hintImages = getFamilyImages("__hints");
    }
    else {
        data.hintImages = [];
    }
    if (req.query.error) {
        if (req.query.error == "invalid_login") {
            data.error = "Invalid username or password";
        }
    }
    return res.render("index", data);
});

app.post("/login", async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    // Admin login
    if (username == "admin" && password == ADMIN_PASSWORD) {
        let data = getData();
        if (data.families) {
            data.families.forEach(family => family.images = getFamilyImages(family.name));
        }
        else {
            data.families = [];
        }
        // get hint images
        try {
            hintImages = await fsExtra.readdir(HINT_IMAGE_DIR);
        } catch (error) {
            console.error("Error reading files:", error);
            return res.status(500).send("Server error");
        }
        return res.render("admin", { families: data.families, hintImages: hintImages });
    }

    // Family leader login
    let data = getData();
    if (data.families) {
        let family = data.families.find((family) => family.name == username);
        if (family && family.password == password) {
            let images;
            try {
                let imagesDir = path.join(__dirname, "scavenger_hunt", username);
                images = await fsExtra.readdir(imagesDir);
            } catch (error) {
                console.error("Error reading files:", error);
                return res.status(500).send("Server error");
            }
            return res.render("family", { family: family, images: images });
        }
    }

    // Invalid login
    return res.redirect("/?error=invalid_login");
});

app.post("/admin", async (req, res) => {
    let data = getData();
    if (data.families) {
        data.families.forEach((family) => {
            if (req.body[`points_${family.name}`]) {
                family.points = parseInt(req.body[`points_${family.name}`]);
            }
        });
        updateData(data);
        // get hint images
        try {
            hintImages = await fsExtra.readdir(HINT_IMAGE_DIR);
        } catch (error) {
            console.error("Error reading files:", error);
            return res.status(500).send("Server error");
        }
        return res.render("admin", { families: data.families, hintImages: hintImages });
    }
});

app.post("/family", upload.array("scavenger_hunt"), async (req, res) => {
    let familyName = req.query.family;
    let imagesDir = path.join(__dirname, "scavenger_hunt", familyName);
    let images;
    try {
        images = await fsExtra.readdir(imagesDir);
    } catch (error) {
        console.error("Error reading files:", error);
        return res.status(500).send("Server error");
    }
    let data = getData();
    let family = data.families.find(f => f.name === familyName);

    if (!family) {
        return res.redirect("/");
    }

    res.render("family", { family: family, images: images });
});

app.post("/admin/upload", hintUpload.array("scavenger_hunt"), async (req, res) => {
    let data = getData();
    if (data.families) {
        data.families.forEach(family => family.images = getFamilyImages(family.name));
    }
    else {
        data.families = [];
    }
    // get hint images
    try {
        hintImages = await fsExtra.readdir(HINT_IMAGE_DIR);
    } catch (error) {
        console.error("Error reading files:", error);
        return res.status(500).send("Server error");
    }
    return res.render("admin", { families: data.families, hintImages: hintImages });
});


app.delete("/delete-image", async (req, res) => {
    const familyName = req.query.family;
    const imageName = req.query.image;
    if (!familyName || !imageName) {
        return res.status(400).send("Bad Request");
    }

    const imagePath = path.join(__dirname, "scavenger_hunt", familyName, imageName);

    try {
        await fsExtra.remove(imagePath);
        res.status(200).send("Image deleted successfully");
    } catch (error) {
        console.error("Error deleting the image:", error);
        res.status(500).send("Server error");
    }
});

app.get("/download", (req, res) => {
    const archive = archiver("zip", {
        zlib: { level: 9 }
    });
    archive.on("error", (err) => {
        console.error("Error creating archive:", err);
        res.status(500).send("Server error");
    });
    res.attachment("scavenger_hunt.zip");
    archive.pipe(res);
    archive.directory(path.join(__dirname, "scavenger_hunt"), false);
    archive.finalize();
});

app.get("/api/leaderboard", (req, res) => {
    let points = {};
    let data = getData();
    if (data.families) {
        data.families.forEach((family) => {
            points[family.name] = family.points;
        });
        // Sort by points descending
        points = Object.fromEntries(Object.entries(points).sort(([, a], [, b]) => b - a));
        return res.json(points);
    }
    return res.json({});
});

app.post("/api/toggle-hint-visibility", (req, res) => {
    let data = getData();
    if (data.scav_hunt_hints_visible) {
        data.scav_hunt_hints_visible = false;
    } else {
        data.scav_hunt_hints_visible = true;
    }
    updateData(data);
    return res.json({ "hint_visibility": data.scav_hunt_hints_visible });
});

app.get("/api/hint-visibility", (req, res) => {
    let data = getData();
    return res.json({ "hint_visibility": data.scav_hunt_hints_visible });
});

app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
});
