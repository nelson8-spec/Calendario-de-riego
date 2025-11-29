# Calendario-de-riego SP 🌱

**Sistema de monitoreo y control de riego automático para orquídeas**

## 📋 Descripción del Proyecto

Calendario-de-riego es una aplicación web integrada para monitorear las condiciones ambientales (temperatura y humedad) y programar riegos automáticos para orquídeas. 

**Características principales:**
- 📅 **Calendario de riego**: Programa riegos por día de la semana y hora específica.
- 🌡️ **Monitoreo en tiempo real**: Recibe datos de sensores (temperatura, humedad relativa) vía MQTT desde un ESP8266.
- 📊 **Histórico ambiental**: Visualiza gráficos y registros de condiciones ambientales.
- 🚨 **Alertas inteligentes**: Notificaciones cuando condiciones salen del rango óptimo (humedad 80%, temperatura 18–24°C).
- 🔄 **Integración MQTT**: Conecta sensores IoT (DHT11 en ESP8266) sin código personalizado.
- 🐳 **Docker-ready**: Entorno reproducible con un solo comando.

---

## 🛠️ Herramientas y Tecnologías Utilizadas

| Componente | Herramienta | Versión | Propósito |
|---|---|---|---|
| **Backend** | Node.js + Express | 18 (LTS) | Servidor web, rutas REST, renderización de vistas |
| **Base de datos** | PostgreSQL | 14-alpine | Almacenamiento persistente de calendario y datos ambientales |
| **Template engine** | Pug | (npm) | Renderización dinámica de vistas HTML |
| **MQTT** | mqtt.js | (npm) | Cliente para recibir datos de sensores IoT |
| **ORM/Query** | pg (postgres client) | (npm) | Conexión y consultas a PostgreSQL |
| **Proxy/Load Balancer** | Nginx | stable-alpine | Proxy inverso, servicio de archivos estáticos |
| **Containerización** | Docker + Docker Compose | (installed) | Orquestación de servicios (backend, DB, nginx) |
| **Backup** | Script personalizado | Bash | Exportación automática de datos PostgreSQL |

**Broker MQTT público** (por defecto): `mqtt://broker.emqx.io`  
*(Ideal para prototipado; en producción usa un broker privado)*

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Cliente (Navegador)                       │
│        http://localhost:5000 o http://<tu_ip>               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Nginx (Proxy)                              │
│                    :80 y :443                                │
│            (proxy_pass -> backend:5000)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Node.js + Express                       │
│                   :5000                                      │
│  ┌────────────────┬──────────────────┬────────────────┐    │
│  │ GET /          │ GET /calendario  │ GET /tiempo*   │    │
│  │ POST /guardar  │ POST /eliminar   │ GET /historico │    │
│  └────────────────┴──────────────────┴────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────────┐  ┌──────────────────────┐
│  PostgreSQL DB    │  │   MQTT Broker        │
│  :5432            │  │   (EMQX público)     │
│  - calendario_    │  │                      │
│    riego          │  │  Topics:             │
│  - historial_     │  │  ESP8266/Temperatura │
│    ambiental      │  │  ESP8266/Humedad     │
└───────────────────┘  └──────────────────────┘
                              ▲
                              │
                         ┌────────────────┐
                         │  ESP8266 + DHT11
                         │  (Sensor IoT)
                         └────────────────┘
```

---

## 🔄 Flujo de Funcionamiento

1. **Usuario accede a la web**: Abre `http://localhost:5000` en el navegador.
2. **Página principal**: Muestra notificación del próximo riego del día.
3. **Gestión de calendario**:
   - Ruta `/calendario`: visualiza riegos programados, añade o elimina.
   - POST `/guardar-riego`: inserta nuevos riegos con validación de día y hora.
4. **Monitoreo en tiempo real**:
   - Ruta `/tiempo-real`: último valor de humedad y temperatura recibidos.
   - Ruta `/historico`: últimos 10+ registros (configurable).
5. **Recepción de datos MQTT**:
   - ESP8266 publica en `ESP8266/Temperatura` y `ESP8266/Humedad`.
   - Backend se suscribe automáticamente al iniciar.
   - Cada lectura se guarda en `historial_ambiental` con timestamp.
6. **Alertas**: Si humedad o temperatura salen del rango óptimo, se registra un `WARN` en logs.
7. **Persistencia**: PostgreSQL almacena calendario y datos ambientales; volumen Docker persiste entre reinicios.

---

## 📦 Resumen rápido

- **Puerto backend**: `5000`
- **Puerto nginx (proxy)**: `80`
- **Base de datos**: PostgreSQL (puerto `5432`)
- **Script de inicialización**: `init-db/init.sql`

---

## ✅ Requisitos

- **Node.js** (v16+ o 18 recomendado) si vas a ejecutar sin Docker
- **npm**
- **Docker + Docker Compose** (opcional y recomendado para entorno reproducible)
- **(Opcional) PostgreSQL** si no usarás la imagen Docker

---

## 📁 Estructura del Proyecto

- `server.js` — servidor Express + conexión MQTT + lectura/guardado en PostgreSQL
- `init-db/init.sql` — script de creación de tablas y tipos (`calendario_riego`, `historial_ambiental`)
- `docker-compose.yml` — servicios: db (Postgres), backend (app), nginx, backup
- `Dockerfile` — imagen para el backend (Node.js 18-alpine)
- `nginx/nginx.conf` — configuración Nginx (proxy inverso hacia backend:5000)
- `public/` — archivos estáticos (CSS, JavaScript, imágenes)
- `views/` — plantillas Pug (index, calendario, tiempo_real, historico)
- `backup/` — servicio de respaldo automático de la BD

---

## 📡 Rutas y Endpoints de la API

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| `GET` | `/` | Página principal con notificación del próximo riego | HTML (Pug) |
| `GET` | `/calendario` | Listado de riegos programados | HTML con tabla |
| `POST` | `/guardar-riego` | Guardar nuevo riego | Redirecciona a `/calendario` |
| `POST` | `/eliminar-riego` | Eliminar un riego por ID | Redirecciona a `/calendario` |
| `GET` | `/tiempo-real` | Últimos datos de temperatura y humedad | HTML con valores actuales |
| `GET` | `/historico` | Histórico ambiental (parámetro: `?frecuencia=N`) | HTML con tabla de N registros |

**Variables de query**:
- `/historico?frecuencia=50` — mostrar últimos 50 registros (defecto: 10)

---

## 🔌 Integración MQTT

El proyecto se conecta automáticamente a un broker MQTT (por defecto: `mqtt://broker.emqx.io`).

**Tópicos esperados**:
- `ESP8266/Temperatura` — publica valor numérico (ej: `25.3`)
- `ESP8266/Humedad` — publica valor numérico (ej: `75`)

**Flujo**:
1. Backend se suscribe a ambos tópicos al iniciar.
2. Cuando recibe un mensaje en cada tópico, lo parsea como float.
3. Una vez que recibe **ambos valores**, los inserta en `historial_ambiental`.
4. Si están fuera de rango (H: 75-85%, T: 18-24°C), registra una alerta en logs.

**Cambiar broker (variable de entorno)**:
```powershell
$env:MQTT_BROKER = "mqtt://tu.broker.privado:1883"
node server.js
```

---

## 💾 Base de Datos

Tablas creadas por `init-db/init.sql`:

### `calendario_riego`
```sql
CREATE TABLE calendario_riego (
    id SERIAL PRIMARY KEY,
    dia_semana dia NOT NULL,  -- tipo enum
    hora TIME NOT NULL,
    CONSTRAINT unico_riego_diayhora UNIQUE (dia_semana, hora)
);
```

### `historial_ambiental`
```sql
CREATE TABLE historial_ambiental (
    id SERIAL PRIMARY KEY,
    humedad_relativa NUMERIC(5,2) NOT NULL,
    temperatura NUMERIC(4,1),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Comienzo rápido — Docker Compose (recomendado)

1. Desde la carpeta raíz del proyecto:

```powershell
Set-Location "C:\Users\Paola\OneDrive\Documentos\integracion final\Calendario-de-riego\Calendario-de-riego"
docker-compose up --build -d
```

2. Ver logs:

```powershell
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f nginx
```

3. Accede desde el host:
- Backend directo: `http://localhost:5000`
- Nginx (proxy): `http://localhost`

Notas:
- La primera vez que se crea el volumen de Postgres, Docker ejecuta los scripts dentro de `init-db/` montado en `/docker-entrypoint-initdb.d`. Si el volumen ya existe, `init.sql` no se ejecutará de nuevo.
- Si necesitas forzar una re-inicialización (pierdes datos):

```powershell
docker-compose down
# borrar volumen (ATENCIÓN: borra datos)
docker volume rm <nombre_del_volumen>
docker-compose up -d
```

Puedes ver el nombre real del volumen con `docker volume ls`.


### Opción B: Ejecutar la aplicación en la máquina local (sin Docker)

Útil si la otra persona quiere ejecutar el proyecto directamente.

1. Instalar dependencias:

```powershell
Set-Location "C:\ruta\a\Calendario-de-riego\Calendario-de-riego"
npm install
```

2. Configurar las variables de entorno (PowerShell — sesión actual):

```powershell
$env:PGHOST = "localhost"
$env:PGUSER = "postgres_user"
$env:PGPASSWORD = "postgres_password"
$env:PGDATABASE = "orquidea_db"
$env:PGPORT = "5432"
```

Ajusta los valores según su instalación de PostgreSQL.

3. Inicializar la base de datos (con `psql`):

```powershell
psql -h $env:PGHOST -U $env:PGUSER -d $env:PGDATABASE -f .\init-db\init.sql
```

Si no tiene `psql`, puede crear la BD y tablas desde una herramienta gráfica o levantar un contenedor PostgreSQL.

4. Ejecutar la app:

```powershell
node server.js
# o (si existe): npm start
```

5. Abrir en el navegador: `http://localhost:5000`


### Opción C: Híbrido — Postgres en Docker + Node local

Si la otra persona no quiere instalar Postgres, puede levantar solo Postgres en Docker y ejecutar Node local.

```powershell
docker run -d --name calendario-postgres -e POSTGRES_USER=postgres_user -e POSTGRES_PASSWORD=postgres_password -e POSTGRES_DB=orquidea_db -p 5432:5432 postgres:14-alpine
```

Luego fijar las mismas variables `PG*` apuntando a `localhost` y ejecutar `node server.js`.

---

## ✍️ Para compartir el proyecto con otros

**Opción 1: Con Docker (lo más sencillo)**
- La otra persona solo necesita tener Docker y Docker Compose instalados.
- Clona el repo o copia la carpeta del proyecto.
- Ejecuta: `docker-compose up --build`
- Abre: `http://localhost:5000`

**Opción 2: Sin Docker (instancia local)**
- La otra persona instala Node.js, npm y PostgreSQL (o levanta solo Postgres en Docker).
- Clona el repo.
- Sigue los pasos de la **Opción B** o **Opción C** de arriba.
- Define variables de entorno y ejecuta `node server.js`.

**Opción 3: Ver desde su equipo mientras corre en el tuyo (LAN)**
- Tu máquina levanta Docker/Node.
- Otra persona accede vía `http://<tu_ip>:5000`.
- Requiere que abras el firewall (ver sección anterior).

---

## 🔧 Inicializar / actualizar `init.sql` con seguridad

El script `init-db/init.sql` crea tablas y un tipo enum. En algunas versiones de Postgres, `CREATE TYPE` falla si el tipo ya existe. Opciones:

- **Borrar volumen** (pierdes datos, útil para desarrollo):
```powershell
docker-compose down
docker volume rm <nombre_del_volumen>
docker-compose up -d
```

- **Ejecutar script manualmente**: si necesitas reusar datos existentes, edita `init.sql` para usar `IF NOT EXISTS` en la creación del tipo.

Ver volúmenes:
```powershell
docker volume ls
```

---

## 🐛 Comandos útiles de diagnóstico

```powershell
# Ver contenedores y puertos mapeados
docker-compose ps

# Logs de servicios
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f nginx

# Conectarse a Postgres dentro del contenedor
docker exec -it orquidea_db psql -U postgres_user -d orquidea_db

# Ejecutar init.sql manualmente si es necesario
docker cp .\init-db\init.sql orquidea_db:/init.sql
docker exec -it orquidea_db psql -U postgres_user -d orquidea_db -f /init.sql

# Pruebas rápidas
curl http://localhost:5000/
curl http://localhost/
```

---

## ⚠️ Problemas comunes y soluciones

| Problema | Causa probable | Solución |
|---|---|---|
| Error: "Variables de entorno PostgreSQL no configuradas" | Variables PG no definidas | Define `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` |
| Error SQL: "type 'dia' already exists" | Tipo enum creado en ejecución anterior | Borrar volumen o ejecutar solo tablas |
| Nginx devuelve 502 | Backend no está corriendo o puerto incorrecto | Revisar `docker-compose logs backend` y `docker-compose ps` |
| No se ven archivos estáticos desde nginx | `./public` no montada en contenedor | Montar volumen `./public:/usr/share/nginx/html/public:ro` en compose |
| No puedo acceder desde otro equipo (LAN) | Firewall bloqueando o app no expuesta | Abrir puertos en firewall (ver sección "Permitir LAN") |
| MQTT no conecta | Broker no disponible o IP incorrecta | Cambiar `MQTT_BROKER` o verificar conectividad a `broker.emqx.io` |

---

## 📚 Referencias y documentación

- [Express.js](https://expressjs.com/) — Framework web
- [PostgreSQL](https://www.postgresql.org/) — Base de datos relacional
- [Pug (Jade)](https://pugjs.org/) — Template engine
- [mqtt.js](https://github.com/mqttjs/MQTT.js) — Cliente MQTT
- [Docker Compose](https://docs.docker.com/compose/) — Orquestación de contenedores
- [Nginx](https://nginx.org/) — Servidor web y proxy
- [Node.js](https://nodejs.org/) — Runtime JavaScript

---

## 🤝 Contribuciones y mejoras futuras

Este proyecto es funcional y puede extenderse con:
- Interfaz gráfica mejorada (React, Vue, etc.)
- Autenticación y autorización de usuarios
- Gráficas de datos históricos (Chart.js, D3.js)
- Notificaciones push (email, SMS, aplicación)
- Integración con actuadores (relés para riego automático)
- Predicción de riego basada en patrones de clima

---

**Creado en noviembre de 2025.**


- Error: "Variables de entorno PostgreSQL no configuradas" -> Define `PGHOST` y `PGUSER` (ver sección B).
- Error SQL sobre `CREATE TYPE` existente -> borrar volumen de Postgres o editar `init.sql` para comprobar existencia del tipo.
- Nginx devuelve 502 -> revisa que el backend esté corriendo y que `docker-compose` mapee el puerto correctamente.
- No se ven archivos estáticos desde nginx -> asegúrate de montar `./public` en el contenedor nginx o servirlos desde el backend.

---

