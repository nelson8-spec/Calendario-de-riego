const express = require('express');
const mqtt = require('mqtt');
const { Pool } = require('pg'); 
const fs = require('fs'); 

const app = express();
const port = 5000;

const pool = new Pool({
    user: process.env.PGUSER || 'postgres_user',        
    host: process.env.PGHOST || 'localhost',          
    database: process.env.PGDATABASE || 'orquidea_db',  
    password: process.env.PGPASSWORD || '',
    port: process.env.PGPORT || 5432,
    max: 20, 
    idleTimeoutMillis: 30000 
});

pool.on('connect', () => {
    console.log('PostgreSQL: Conectado exitosamente a la base de datos.');
});

pool.on('error', (err) => {
    console.error('PostgreSQL: Error inactivo en la conexión al pool:', err);
});

async function query(text, params) {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
}

async function initializeDatabase() {
    console.log('PostgreSQL: Verificando la estructura de la base de datos...');
    try {
        const initScript = fs.readFileSync('init.sql', 'utf8');
        await query(initScript); 
        console.log('PostgreSQL: Inicialización de tablas completada exitosamente.');
    } catch (err) {
        console.error('ERROR CRÍTICO: No se pudo inicializar la base de datos.');
        console.error('Asegúrese de que el archivo init.sql exista y que la base de datos de PostgreSQL esté activa y accesible.');
        console.error('Detalles del Error:', err.message);
        throw err;
    }
}

app.set('view engine', 'pug');
app.set('views', './views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function getDayName() {
    const d = new Date();
    const day = d.getDay(); 
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
}

app.get('/', async (req, res) => {
    const hoy = getDayName();
    const now = new Date();
    const hora_actual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let notificacion = '';
    
    try {
        // SQL para buscar el PRÓXIMO riego programado para HOY
        // Usamos $1, $2 y la conversión a tipo time de PostgreSQL
        const sql_proximo = 'SELECT hora FROM calendario_riego WHERE dia_semana = $1 AND hora > $2::time ORDER BY hora ASC LIMIT 1';
        let result = await query(sql_proximo, [hoy, hora_actual]);

        if (result.rows.length > 0) {
            const hora_riego = result.rows[0].hora.substring(0, 5); 
            notificacion = `Recordatorio: Próximo riego hoy a las ${hora_riego}`;
        } else {
            const sql_pasado = 'SELECT hora FROM calendario_riego WHERE dia_semana = $1 AND hora < $2::time ORDER BY hora DESC LIMIT 1';
            let result_pasado = await query(sql_pasado, [hoy, hora_actual]);

            if (result_pasado.rows.length > 0) {
                const hora_riego = result_pasado.rows[0].hora.substring(0, 5);
                notificacion = `Riego de hoy a las ${hora_riego} completado.`;
            } else {
                notificacion = 'No hay riegos programados para hoy.';
            }
        }
        
        res.render('index', {
            title: 'Monitor de Orquídeas',
            notificacion: notificacion
        });

    } catch (err) {
        console.error('Error al verificar calendario de riego:', err);
        res.render('index', { title: 'Monitor de Orquídeas', notificacion: 'Error al verificar calendario de riego.' });
    }
});

app.get('/calendario', async (req, res) => {
    const sql = `
        SELECT dia_semana, TO_CHAR(hora, 'HH24:MI') AS hora, id
        FROM calendario_riego 
        ORDER BY 
            CASE dia_semana
                WHEN 'Lunes' THEN 1
                WHEN 'Martes' THEN 2
                WHEN 'Miércoles' THEN 3
                WHEN 'Jueves' THEN 4
                WHEN 'Viernes' THEN 5
                WHEN 'Sábado' THEN 6
                WHEN 'Domingo' THEN 7
            END,
            hora;
    `;

    try {
        const result = await query(sql);
        res.render('calendario', {
            title: 'Calendario de Riego',
            riegos: result.rows 
        });
    } catch (err) {
        console.error('Error al cargar calendario:', err);
        return res.status(500).send('Error al cargar calendario');
    }
});

app.post('/guardar-riego', async (req, res) => {
    const { dia_semana, hora } = req.body;

    const sql = 'INSERT INTO calendario_riego (dia_semana, hora) VALUES ($1, $2) RETURNING id';
    try {
        const result = await query(sql, [dia_semana, hora]);
        console.log('Riego guardado con ID:', result.rows[0].id);
        res.redirect('/calendario');
    } catch (err) {
        console.error('Error al guardar riego:', err, `Valores: ${dia_semana}, ${hora}`);
        res.status(500).send('Error al guardar riego. Verifique el formato de día/hora.');
    }
});

app.post('/eliminar-riego', async (req, res) => {
    const { id } = req.body;

    const sql = 'DELETE FROM calendario_riego WHERE id = $1';
    try {
        await query(sql, [id]);
        console.log(`Riego con ID ${id} eliminado.`);
        res.redirect('/calendario');
    } catch (err) {
        console.error('Error al eliminar riego:', err);
        res.status(500).send('Error al eliminar riego.');
    }
});

app.get('/tiempo-real', async (req, res) => {
    const sql = 'SELECT humedad_relativa, temperatura, TO_CHAR(timestamp, \'YYYY-MM-DD HH24:MI:SS\') AS timestamp FROM historial_ambiental ORDER BY id DESC LIMIT 1';
    
    try {
        const result = await query(sql);
        let data = result.rows[0] || null; 

        if (data) {
            const HUMEDAD_OP = 80;
            const TEMP_MIN = 18;
            const TEMP_MAX = 24;
            
            let alerta = '';
            if (data.humedad_relativa < HUMEDAD_OP - 5 || data.humedad_relativa > HUMEDAD_OP + 5) { 
                alerta += 'Nivel de humedad fuera del 80% óptimo';
            }
            if (data.temperatura < TEMP_MIN || data.temperatura > TEMP_MAX) {
                alerta += (alerta ? ' y ' : '') + 'Temperatura fuera del rango óptimo (18ºC-24ºC)';
            }
            data.alerta = alerta;
        }

        res.render('tiempo_real', { 
            title: 'Datos en Tiempo Real',
            data: data
        });
    } catch (err) {
        console.error('Error al cargar datos en tiempo real:', err);
        res.status(500).send('Error al cargar datos en tiempo real.');
    }
});

app.get('/historico', async (req, res) => {
    const limit = parseInt(req.query.frecuencia) || 10;
    
    const sql = 'SELECT humedad_relativa, temperatura, TO_CHAR(timestamp, \'YYYY-MM-DD HH24:MI:SS\') AS timestamp FROM historial_ambiental ORDER BY id DESC LIMIT $1';
    
    try {
        const result = await query(sql, [limit]);
        res.render('historico', { 
            title: 'Histórico Ambiental',
            historico: result.rows
        });
    } catch (err) {
        console.error('Error al cargar historial:', err);
        return res.status(500).send('Error al cargar historial');
    }
});

const mqtt_broker = 'mqtt://broker.emqx.io';
const temperatura_topic = 'ESP8266/Temperatura';
const humedad_topic = 'ESP8266/Humedad';

const mqttClient = mqtt.connect(mqtt_broker);
console.log('Intentando conectar al broker MQTT...');

let latestData = {
    humedad: null,
    temperatura: null
};

mqttClient.on('connect', () => {
    console.log('MQTT: Conectado exitosamente al broker MQTT.');
    mqttClient.subscribe([temperatura_topic, humedad_topic], (err) => {
        if (!err) {
            console.log(`MQTT: Suscrito a los tópicos: ${temperatura_topic} y ${humedad_topic}`);
        }
    });
});

mqttClient.on('message', (topic, message) => {
    const value = parseFloat(message.toString());
    if (isNaN(value)) return;

    if (topic === humedad_topic) {
        latestData.humedad = value;
    } else if (topic === temperatura_topic) {
        latestData.temperatura = value;
    }

    if (latestData.humedad !== null && latestData.temperatura !== null) {
        const sql_insert = 'INSERT INTO historial_ambiental (humedad_relativa, temperatura) VALUES ($1, $2)';
        
        query(sql_insert, [latestData.humedad, latestData.temperatura])
            .then(() => {
                console.log(`MQTT: Dato guardado. H: ${latestData.humedad}%, T: ${latestData.temperatura}°C`);
                
                const HUMEDAD_OP = 80;
                const TEMP_MIN = 18;
                const TEMP_MAX = 24;
                
                const fueraHumedad = (latestData.humedad < HUMEDAD_OP - 5 || latestData.humedad > HUMEDAD_OP + 5);
                const fueraTemp = (latestData.temperatura < TEMP_MIN || latestData.temperatura > TEMP_MAX);
                
                if (fueraHumedad || fueraTemp) {
                    console.warn('ALERTA (MQTT): Condición ambiental fuera del rango óptimo.');
                }
                
                latestData.humedad = null;
                latestData.temperatura = null;
            })
            .catch(err => console.error('Error al guardar datos de sensor (MQTT):', err));
    }
});

initializeDatabase()
    .then(() => {
        app.listen(port, () => {
            console.log(`Servidor Express operativo en el puerto ${port}`);
        });
    })
    .catch(err => {
        console.error('Fallo al iniciar el servidor debido a error de DB.', err);
    });