const express = require("express");
const Handlebars = require("hbs");
const fs = require("fs");

const app = express();
var postcssMiddleware = require('postcss-middleware');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/css', postcssMiddleware({
    src: () => "**/**.html",
    plugins: []

}));


const getData = () => {
    return JSON.parse(fs.readFileSync("data.json"));
}

const updateData = (data) => {
    fs.writeFileSync("data.json", JSON.stringify(data));
}
Handlebars.registerPartials(__dirname + "/views/partials/", (error) => { if (error) throw error });
app.set("view engine", "hbs");

app.use(express.static(__dirname + "/public"));


ADMIN_PASSWORD = getData().admin_pw;

app.get('/', (req, res) => {
    return res.render("index");
});

app.post('/login', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    if (username == "admin" && password == ADMIN_PASSWORD) {
        return res.render("admin", { families: getData().families });
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


app.get("/api/leaderboard", (req, res) => {
    let points = {};
    let data = getData();
    data.families.forEach((family) => {
        points[family.name] = family.points;
    });
    points = Object.fromEntries(Object.entries(points).sort(([, a], [, b]) => b - a));
    return res.json(points);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
});
