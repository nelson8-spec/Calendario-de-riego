const express = require('express');
const bodyParser = require('body-parser')

const app = express();
const port = 3000;

app.set('view engine', 'pug');
app.set('views', './views');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.render('index', { title: 'Monitos de Orquideas' });
});

app.listen(port, () => {
    console.log(`Servidor iniciando en http://localhost:${port}`);
});