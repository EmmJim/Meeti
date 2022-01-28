const Usuarios = require('../models/Usuarios');
const {body, validationResult} = require('express-validator');
const enviarEmail = require('../handlers/emails');

const multer = require('multer');
const shortid = require('shortid');
const fs = require('fs');

const configuracionMulter = {
    limits: { filesize: 100000},
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, next) => {
            next(null, __dirname+'/../public/uploads/perfiles/');
        },
        filename: (req, file, next) => {
            const extension = file.mimetype.split('/')[1];
            next(null, `${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req, file, next) {
        if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
            //El formato es válido
            next(null, true);
        }else{
            //El formato no es válido
            next(new Error('Formato no válido'), false);
        }
    }
}

const upload = multer(configuracionMulter).single('imagen');

//Sube imagen en el servidor
exports.subirImagen = (req, res, next) => {
    upload(req, res, function(error) {
        if(error) {
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error', 'El archivo es muy grande');
                }else{
                    req.flash('error', error.message);
                }
            }else if(error.hasOwnProperty('message')){
                req.flash('error', error.message);
            }
            res.redirect('back');
            return;
        }else{
            next();
        }
    })
}

exports.formCrearCuenta = (req, res) => {
    res.render('crear-cuenta', {
        nombrePagina: 'Crea tu Cuenta'
    });
}

exports.crearNuevaCuenta = async (req, res, next) => {
    const usuario = req.body;

    const rules = [
        body('confirmar').notEmpty().withMessage('Debes de confirmar tu password'),
        body('confirmar').equals(req.body.password).withMessage('El password es diferente')
    ]
    await Promise.all(rules.map(validation => validation.run(req)))

    //Leer los errores de express
    const erroresExpress = validationResult(req);

    try {
        await Usuarios.create(usuario);

        //Url de confirmacion
        const url = `http://${req.headers.host}/confirmar-cuenta/${usuario.email}`;

        //Enviar email de confirmación
        await enviarEmail.enviarEmail({
            usuario,
            url,
            subject: 'Confirma tu cuenta de Meeti',
            archivo: 'confirmar-cuenta'
        })

        //Flash Message y redireccionar
        req.flash('exito', 'Hemos enviado un email, confirma tu cuenta');
        res.redirect('/iniciar-sesion');
    } catch (error) {

        //Extraer el msg de los errores de Sequelize
        const erroresSequelize = error.errors.map(err => err.message);
        //Extraer el msg de los errores de express validator
        const errExpress = erroresExpress.errors.map(err => err.msg);
        
        //Unirlos
        const listaErrores = [...erroresSequelize, ...errExpress];
        // console.log(erroresSequelize);
        req.flash('error', listaErrores);
        res.redirect('/crear-cuenta');
    }

}

//Confirma la suscripción del usuario
exports.confirmarCuenta = async (req, res, next) => {
    //Verificar que el usuario existe
    const usuario = await Usuarios.findOne({where: {email: req.params.correo}});
    //Si no existe, vamos a redireccionar
    if(!usuario) {
        req.flash('error', 'No existe esa cuenta');
        res.redirect('/crear-cuenta');
        return next();
    }

    //Si existe, confirmar suscripcion y redireccionar
    usuario.activo = 1;
    await usuario.save();
    req.flash('exito', 'La cuenta se ha confirmado, ya puedes iniciar sesión');
    res.redirect('/iniciar-sesion');
}

exports.formIniciarSesion = (req, res) => {
    res.render('iniciar-sesion', {
        nombrePagina: 'Iniciar Sesión'
    });
}

//Muestra el formulario para editar el perfil
exports.formEditarPerfil = async (req, res) => {
    const usuario = await Usuarios.findByPk(req.user.id);

    res.render('editar-perfil',{
        nombrePagina: 'Editar Perfil',
        usuario
    })
}

//Almacena en la base de datos los cambios del perfil
exports.editarPerfil = async (req, res) => {
    const usuario = await Usuarios.findByPk(req.user.id);

    body('titulo').trim().escape();
    body('descripcion').trim().escape();
    body('email').trim().escape();

    //Leer datos del form
    const {nombre, descripcion, email} = req.body;

    //Asginar los valores
    usuario.nombre = nombre;
    usuario.descripcion = descripcion;
    usuario.email = email;


    //Guardar en la BD
    await usuario.save();

    req.flash('exito', 'Cambios Guardados Correctamente');
    res.redirect('/administracion');

}

//Formulario para cambiar el password
exports.formCambiarPassword = (req, res) => {
    res.render('cambiar-password', {
        nombrePagina: 'Cambiar Password'
    })
}

//Revisa si el password anterior es correcto y lo modifica por uno nuevo
exports.cambiarPassword = async (req, res, next) => {
    const usuario = await Usuarios.findByPk(req.user.id);

    //Verificar que el password anterior sea correcto
    if(!usuario.validarPassword(req.body.anterior)){
        req.flash('error', 'El password actual es incorrecto');
        res.redirect('/administracion');
        return next();
    }

    //Si el password es correcto, hashear el nuevo
    const hash = usuario.hashPassword(req.body.nuevo);

    //Asignar el password al usuario
    usuario.password = hash;

    //Guardar en la base de datos
    await usuario.save();

    //Redireccionar
    req.logout();
    req.flash('exito', 'Password Modificado Correctamente, vuelve a iniciar sesión');
    res.redirect('/iniciar-sesion');
}

//Muestra el formulario para subir una imagen de perfil
exports.formSubirImagenPerfil = async (req, res) => {
    const usuario = await Usuarios.findByPk(req.user.id);

    //Mostrar la vista
    res.render('imagen-perfil', {
        nombrePagina: 'Subir Imagen Perfil',
        usuario
    })
}

//Guarda la imagen nueva, elimina la anterior (si aplica) y guarda el registro en la BD
exports.guardarImagenPerfil = async(req, res) => {
    const usuario = await Usuarios.findByPk(req.user.id);

    //Si hay imagen anterior eliminarla
    if(req.file && usuario.imagen){
        const imagenAnteriorPath = __dirname + `/../public/uploads/perfiles/${usuario.imagen}`;
        
        //Eliminar archivo con filesystem
        fs.unlink(imagenAnteriorPath, (error) => {
            if(error){
                console.log(error);
            }
            return;
        })
    }

    //Almacenar la nueva imagen
    if(req.file) {
        usuario.imagen = req.file.filename;
    }

    //Almacenar en la BD y redireccionar
    await usuario.save();
    req.flash('exito', 'Cambios Almacenados Correctamente');
    res.redirect('/administracion');
}