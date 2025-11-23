const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const mqtt = require('mqtt'); 

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

function getDayName() {
    const d = new Date();
    const day = d.getDay(); 
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
}

app.get('/', (req, res) => {
    const hoy = getDayName();
    const now = new Date();
    const hora_actual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const sql = 'SELECT TIME_FORMAT(hora, "%H:%i") AS hora FROM calendario_riego WHERE dia_semana = ? AND hora > ? ORDER BY hora ASC LIMIT 1';
    
    db.query(sql, [hoy, hora_actual], (err, results) => {
        let notificacion = '';

        if (err) {
            console.error(err);
            notificacion = 'Error al verificar calendario de riego.';
        } else if (results.length > 0) {
            notificacion = `Recordatorio, próximo riego hoy a las ${results[0].hora}`;
        } else {
            const sql_pasado = 'SELECT TIME_FORMAT(hora, "%H:%i") AS hora FROM calendario_riego WHERE dia_semana = ? AND hora < ? ORDER BY hora DESC LIMIT 1';
            db.query(sql_pasado, [hoy, hora_actual], (err_pasado, results_pasado) => {
                if (err_pasado) {
                    console.error(err_pasado);
                } else if (results_pasado.length > 0) {
                    notificacion = `Riego de hoy a las ${results_pasado[0].hora} completado.`;
                }

                res.render('index', {
                    title: 'Calendario de Riego',
                    notificacion: notificacion
                });
            });
            return;
        }

        res.render('index', {
            title: 'Calendario de Riego',
            notificacion: notificacion
        });
    });
});

app.get('/calendario', (req, res) => {
    const sql = 'SELECT dia_semana, TIME_FORMAT(hora, "%H:%i") AS hora FROM calendario_riego ORDER BY FIELD(dia_semana, "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"), hora';

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar calendario');
        }
        res.render('calendario', {
            title: 'Calendario de Riego',
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

app.post('/api/datos-ambientales', (req, res) => {
    const { humedad, temperatura } = req.body;

    if (typeof humedad === 'undefined' || typeof temperatura === 'undefined') {
        return res.status(400).json({ success: false, message: 'Faltan datos de humedad o temperatura' });
    }

    const sql_insert = 'INSERT INTO historial_ambiental (humedad_relativa, temperatura) VALUES (?, ?)';
    db.query(sql_insert, [humedad, temperatura], (err, result) => {
        if (err) {
            console.error('Error al guardar datos de sensor:', err);
            return res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
        
        console.log(`Dato ambiental recibido y guardado. Humedad: ${humedad}%, Temp: ${temperatura}°C`);
        
        let notificacion_sensor = '';
        const HUMEDAD_OP = 80;
        const TEMP_MIN = 18;
        const TEMP_MAX = 24;
        
        if (humedad < HUMEDAD_OP - 5 || humedad > HUMEDAD_OP + 5) {
            notificacion_sensor += 'Alerta: Nivel de humedad fuera del 80% óptimo';
        }
        if (temperatura < TEMP_MIN || temperatura > TEMP_MAX) {
            notificacion_sensor += ' Alerta: Temperatura fuera del rango óptimo (18ºC-24ºC)';
        }

        if (notificacion_sensor) {
            console.warn(notificacion_sensor);
        }

        res.json({ 
            success: true, 
            message: 'Datos recibidos y procesados',
            alerta: notificacion_sensor.trim()
        });
    });
});

app.get('/tiempo-real', (req, res) => {
    const sql = 'SELECT *, DATE_FORMAT(timestamp, "%Y-%m-%d %H:%i:%s") AS timestamp FROM historial_ambiental ORDER BY id DESC LIMIT 1';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar datos en tiempo real');
        }

        let data = results[0] || null;
        
        if (data) {
            const HUMEDAD_OP = 80;
            const TEMP_MIN = 18;
            const TEMP_MAX = 24;
            
            let alerta = '';
            if (data.humedad_relativa < HUMEDAD_OP - 5 || data.humedad_relativa > HUMEDAD_OP + 5) { 
                alerta += 'Nivel de humedad fuera del 80% óptimo';
            }
            if (data.temperatura < TEMP_MIN || data.temperatura > TEMP_MAX) {
                alerta += (alerta ? ' ' : '') + 'Temperatura fuera del rango óptimo (18ºC-24ºC)';
            }
            data.alerta = alerta;
        }

        res.render('tiempo_real', { 
            title: 'Datos en Tiempo Real',
            data: data
        });
    });
});

app.get('/historico', (req, res) => {
    const limit = parseInt(req.query.frecuencia) || 10;
    
    const sql = 'SELECT humedad_relativa, temperatura, DATE_FORMAT(timestamp, "%Y-%m-%d %H:%i:%s") AS timestamp FROM historial_ambiental ORDER BY id DESC LIMIT ?';
    
    db.query(sql, [limit], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar historial');
        }

        res.render('historico', { 
            title: 'Histórico Ambiental',
            historico: results
        });
    });
});

const mqtt_broker = 'mqtt://broker.emqx.io';
const temperatura_topic = 'ESP8266/Temperatura';
const humedad_topic = 'ESP8266/Humedad';

const mqttClient = mqtt.connect(mqtt_broker);
console.log('Intentando conectar al broker MQTT...');

let latestData = {
    humedad: null,
    temperatura: null,
    timestamp: null
};

mqttClient.on('connect', () => {
    console.log('Conectado exitosamente al broker MQTT.');
    mqttClient.subscribe([temperatura_topic, humedad_topic], (err) => {
        if (err) {
            console.error('Error al suscribirse a tópicos MQTT:', err);
        } else {
            console.log(`Suscrito a los tópicos: ${temperatura_topic} y ${humedad_topic}`);
        }
    });
});

mqttClient.on('message', (topic, message) => {
    const value = parseFloat(message.toString());
    const now = new Date();
    if (isNaN(value)) return;

    if (topic === humedad_topic) {
        latestData.humedad = value;
    } else if (topic === temperatura_topic) {
        latestData.temperatura = value;
    }
    latestData.timestamp = now;

    if (latestData.humedad !== null && latestData.temperatura !== null) {
        const sql_insert = 'INSERT INTO historial_ambiental (humedad_relativa, temperatura) VALUES (?, ?)';
        
        db.query(sql_insert, [latestData.humedad, latestData.temperatura], (err, result) => {
            if (err) {
                console.error('Error al guardar datos de sensor (MQTT):', err);
                return;
            }
            
            console.log(`Dato MQTT guardado. H: ${latestData.humedad}%, T: ${latestData.temperatura}°C`);
            
            const HUMEDAD_OP = 80;
            const TEMP_MIN = 18;
            const TEMP_MAX = 24;
            
            const fueraHumedad = (latestData.humedad < HUMEDAD_OP - 5 || latestData.humedad > HUMEDAD_OP + 5);
            const fueraTemp = (latestData.temperatura < TEMP_MIN || latestData.temperatura > TEMP_MAX);
            if (fueraHumedad || fueraTemp) {
                console.warn('🚨 ALERTA (MQTT): Condición ambiental fuera del rango óptimo.');
            }
            
            latestData.humedad = null;
            latestData.temperatura = null;
        });
    }
});

app.listen(port, () => {
    console.log(`Servidor iniciando en http://localhost:${port}`);
});