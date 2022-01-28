const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const routes = require('./routes');
const bodyParser = require('body-parser');
const path = require('path');
const flash = require('connect-flash');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');

//Configuracion y Modelos BD
const db = require('./config/db');
    require('./models/Usuarios');
    require('./models/Categorias');
    require('./models/Comentarios');
    require('./models/Grupos');
    require('./models/Meeti');
    db.sync().then(()=> console.log('DB Conectada')).catch((error) => console.log(error));

//Variables de desarrollo

require('dotenv').config({path: 'variables.env'});

//Aplicacion Principal

const app = express();

//Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


//Habilitar EJS como template engine
app.use(expressLayouts);
app.set('view engine', 'ejs');

//Ubicación de las vistas
app.set('views', path.join(__dirname, './views'));

//Archivos estaticos
app.use(express.static('public'));

//Habilitar cookie Parser
app.use(cookieParser());

//Crear la session
app.use(session({
    secret: process.env.SECRETO,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false
}))

//Inicializar passport
app.use(passport.initialize());
app.use(passport.session());

//Agrega flash messages
app.use(flash());

//Middleware (usuario logueado, flash messages, fecha actual)
app.use((req, res, next) => {
    res.locals.mensajes = req.flash();
    const fecha = new Date();
    res.locals.year = fecha.getFullYear();
    res.locals.usuario = {...req.user} || null;

    next();
});

//Routing
app.use('/', routes());

//Leer el host y el puerto
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 5000;

//Agrega el puerto
app.listen(port, host, () => {
    console.log('El servidor está funcionando');
})


