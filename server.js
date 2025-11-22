const express = require('express');
const bodyParser = require('body-parser')
const mysql = require('mysql');

const app = express();
const port = 3000;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '62}91Adc_.c5',
    database: 'calendario_de_riego'
});

db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos: ' + err.stack);
        return;
    }
    console.log('Conectado a la base de datos MySQL como id ' + db.threadId);
});

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

