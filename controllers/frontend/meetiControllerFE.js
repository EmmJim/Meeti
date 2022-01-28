const Meeti = require('../../models/Meeti');
const Grupos = require('../../models/Grupos');
const Usuarios = require('../../models/Usuarios');
const Categorias = require('../../models/Categorias');
const Comentarios = require('../../models/Comentarios');
const moment = require('moment');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;


exports.mostrarMeeti = async (req, res) => {
    const meeti = await Meeti.findOne({
        where: {
            slug: req.params.slug
        }, 
        include: [ 
            { 
                model: Grupos 
            },
            {
                model: Usuarios,
                attributes: ['id', 'nombre', 'imagen']
            }
        ]
    });


    if(!meeti){
        res.redirect('/');
    }

    //Consultar por meetis cercanos
    const ubicacion = Sequelize.literal(`ST_GeomFromText( 'POINT (${meeti.ubicacion.coordinates[0]} ${meeti.ubicacion.coordinates[0]}) ')`);

    //ST_DISTANCE_Sphere = Retorna una linea en metros
    const distancia = Sequelize.fn('ST_DistanceSphere', Sequelize.col('ubicacion'), ubicacion);

    //Encontrar meetis cercanos
    const cercanos = await Meeti.findAll({
        order: distancia, //Ordena del mas cercano al lejano
        where: Sequelize.where(distancia, {[Op.lte]: 20000}), //2km
        limit: 3, //Maximo 3
        offset: 1,
        include: [ 
            { 
                model: Grupos 
            },
            {
                model: Usuarios,
                attributes: ['id', 'nombre', 'imagen']
            }
        ]
    })

    console.log(cercanos)

    const comentarios = await Comentarios.findAll({ 
        where: {meetiId: meeti.id},
        include: [
            {
                model: Usuarios,
                attributes: ['id', 'nombre', 'imagen']
            }
        ]
    })

    //Pasar el resultado a la vista
    res.render('mostrar-meeti', {
        nombrePagina: meeti.titulo,
        meeti,
        moment,
        comentarios,
        cercanos
    })

}

//Confirma o cancela si el usuario asistirá al meeti
exports.confirmarAsistencia = async (req, res) => {
    console.log(req.body);
    const {accion} = req.body;

    if(accion === 'confirmar'){
        //Agregar al usuario
        Meeti.update(
            {'interesados': Sequelize.fn('array_append', Sequelize.col('interesados'), req.user.id)},
            {'where': {'slug' : req.params.slug}}
        );
        //mensaje
        res.send('Has confirmado tu asistencia');
    }else{
        //Cancelar al usuario
        Meeti.update(
            {'interesados': Sequelize.fn('array_remove', Sequelize.col('interesados'), req.user.id)},
            {'where': {'slug' : req.params.slug}}
        );
        //mensaje
        res.send('Has cancelado tu asistencia');
    }
    

    
}

//Muestra el listado de asistentes
exports.mostrarAsistentes = async (req, res) => {
    const meeti = await Meeti.findOne({
        where: {
            slug: req.params.slug
        },
        attributes: ['interesados']
    })

    //Extraer interesados
    const {interesados} = meeti;

    const asistentes = await Usuarios.findAll({
        attributes: ['nombre', 'imagen'],
        where: {id: interesados}
    })

    //Crear la vista y pasar los datos
    res.render('asistentes', {
        nombrePagina: 'Listado Asistentes Meeti',
        asistentes
    })
}

//Muestra los meetis agrupados por categoria
exports.mostrarCategoria = async (req, res, next) => {
    const categoria = await Categorias.findOne({ 
        where: {slug: req.params.categoria},
        attributes: ['id', 'nombre']
    });

    const meetis = await Meeti.findAll({
        order: [
            ['fecha', 'ASC']
        ],
        include: [
            {
                model: Grupos,
                where: { categoriaId: categoria.id}
            },
            {
                model: Usuarios
            }
        ]
    });

    res.render('categoria', {
        nombrePagina: `Categoria: ${categoria.nombre}`,
        meetis,
        moment
    })

    console.log(categoria.id)
}