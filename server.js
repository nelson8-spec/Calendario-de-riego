const express = require('express');
const bodyParser = require('body-parser')
const mysql = require('mysql2');

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

app.get('/calendario', (req, res) => {
    const sql = 'SELECT dia_semana, TIME_FORMAT(hora, "%H:%i") AS hora FROM calendario_riego ORDER BY FIELD(dia_semana, "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"), hora';

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar calendario.');
        }
        res.render('calendario', {
            title: 'Calendario de riego',
            riegos: results 
        });
    });
});

app.post('/guardar-riego', (req, res) => {
    const { dia_semana, hora } = req.body;

    const sql = 'INSERT INTO calendario_riego (dia_semana, hora) VALUES (?, ?)';
    db.query(sql, [dia_semana, hora], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al guardar riego.');
        }
        console.log('Riego guardado con ID:', results.insertId);
        res.redirect('/calendario');
    });
});