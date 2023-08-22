const express = require("express");
const Handlebars = require("hbs");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/css', postcssMiddleware());

Handlebars.registerPartials(__dirname + "/views/partials/", (error) => { if (error) throw error });
app.set("view engine", "hbs");
app.use(express.static(__dirname + "/public"));

app.get('/', (req, res) => {
    res.render('index.hbs');
});

app.get("/api/leaderboard-info", (request, response) => {

})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
});
