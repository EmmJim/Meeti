const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Usuarios = require('../models/Usuarios');

passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },
    async(email, password, done) => {
        //Código se ejecuta al llenar el formulario
        const usuario = await Usuarios.findOne({ 
                                                where: {email, activo: 1}});

        //Revisar si existe o no
        if(!usuario) return done(null, false, {
            message: 'Ese usuario no existe'
        })

        //El usuario existe, comparar su password
        const verificarPass = usuario.validarPassword(password);

        //Si el pass es incorrecto
        if(!verificarPass) return done(null, false, {
            message: 'Password Incorrecto'
        });

        //Todo bien
        return done(null, usuario);
    }
))

passport.serializeUser(function(usuario, cb) {
    cb(null, usuario);
});
passport.deserializeUser(function(usuario, cb) {
    cb(null, usuario);
});

module.exports = passport;