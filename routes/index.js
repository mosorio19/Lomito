const express = require('express');
const router  = express.Router();
const estados = require('../models/estados')
const Mascotas = require('../models/mascota')
const Usuarios = require('../models/user')
const Adopcion = require('../models/adopcion')
//passport
const passport = require("passport");
const ensureLogin = require('connect-ensure-login')

//upload files
const uploadCloud = require('../config/cloudinary.js');

// Bcrypt to encrypt passwords
const bcrypt = require("bcrypt");
const bcryptSalt = 10;

//Validator
const validator = require('validator');

/* GET home page */
router.get('/', (req, res, next) => {
  res.render('landing');
});


/* LOGIN AND SIGNUP */
  router.get('/login', (req, res, next) => {
    res.render('Login/login', { "message": req.flash("error") })
  });

  router.post("/login", passport.authenticate("local", {
    successRedirect: "/mascotas",
    failureRedirect: "/login",
    failureFlash: true,
    passReqToCallback: true
  }));

  router.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });

  router.get('/signup', (req, res, next) => {
    res.render('Login/signup');
  });

  router.post('/signup', (req, res, next) => {
    const {name, sex, lastname, age, email, password} = req.body
    
    if(!validator.isNumeric(age)) {
      res.render("Login/signup", { message: "Recuerda que tu edad debe ser numérica" });
      return;
    }

    //hacemos validaciones de usuario y password
    if(!validator.isEmail(email)) {
      res.render("Login/signup", { message: "Debes ingresar un email válido" });
      return;
    }

    if(validator.isEmpty(password)) {
      res.render("Login/signup", { message: "Debes ingresar tu contraseña"})
      return;
    }

    //regex para validar password
    /**
     * (?=.*\d) -> Debe contener un número
     * (?=.* [a - z]) -> Debe contener una letra minuscula
     * (?=.* [A - Z]) -> Debe contener una letra mayúscula
     * [a - zA - Z0 - 9]{ 8,} -> Debe ser 8 caracteres como minimo
     */
    /*let resultPassword = /^(?=.*\d)(?=.* [a - z])(?=.* [A - Z])[a - zA - Z0 - 9]{ 8,}$/.test(password);

    if (!resultPassword) {
      res.render("Login/signup", { message: "La contraseña debe contener minimo 8 caracteres, una letra minúscula, una letra mayúscula y 1 número" })
      return;
    }*/

    Usuarios.findOne({ email })
      .then(user => {
        if (user !== null) {
          res.render("Login/signup", { message: "The username already exists" });
          return;
        }

        const salt = bcrypt.genSaltSync(bcryptSalt);
        const hashPass = bcrypt.hashSync(password, salt);

        const newUser = new Usuarios()
        newUser.nombre = name
        newUser.apellidos = lastname
        newUser.edad = age
        newUser.email = email
        newUser.password = hashPass
        newUser.sexo = sex

        //guardamos el nuevo usuario
        newUser.save().then(newUser => {
          res.render('Login/signup_step_2', { newUser, estados })
        }).catch(ex => {
          console.log(ex)
          next(ex)
        })
      })
      .catch(error => {
        next(error)
      })
  });

  router.post('/signup_step_2', uploadCloud.single('photo'), (req, res, next) => {
    const { _id, estado, phone, about_me, about_pet} = req.body

    Usuarios.updateOne({ "_id": _id }, { estado: estado,
        telefono: phone,
        descripcion: about_me,
        mascota_ideal: about_pet,
        image: req.file.url
      })
        .then( user => {
          res.redirect('/login')
        })
        .catch(err => {
          next(err)
        })
  });

/* END LOGIN AND SIGNUP */

/* PRIVATE ROUTES */
  //PET CRUD
  router.get("/mascotas/new", ensureLogin.ensureLoggedIn(), (req, res, next) => {
    res.render("mascotas/new", { user: req.user });
  });

  router.post('/mascotas', ensureLogin.ensureLoggedIn(), uploadCloud.single('photo'), (req, res, next) => {
    const { nombre, edad, caracteristicas, descripcion, raza, talla, direccionAdopcion, requerimientos, horasInicio } = req.body
    const newMascota = new Mascotas({ 
      nombre,
      edad,
      caracteristicas,
      descripcion,
      raza,
      talla,
      image: req.file.url,
      direccionAdopcion,
      horasInicio,
      requerimientos})

    newMascota.user_id = req.user._id

    newMascota.save()
      .then(mascotas => res.redirect(301, '/mascotas'))
      .catch(err => next(err))
  })

  router.get('/mascotas/:id', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    let idMascota = req.params.id
    Mascotas.findOne({ _id: idMascota }).then(mascota => {
      res.render('vista_mascota_interna', { mascota })
    }).catch(err => next(err))
  })

  router.get('/mascotas/delete/:id', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    let idMascotas = req.params.id
    Mascotas.findByIdAndRemove(idMascotas).then(() => res.redirect(301, '/mascotas/my_pets/all'))
      .catch(err => console.log(err))
  })

  router.get('/mascotas', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    Mascotas.find({status: 3})
      .then(mascotas => {
        res.render('vista_mascotas', { mascotas })
      })
  })

  router.get('/mascotas/my_pets/all', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    Mascotas.find({ user_id: req.user._id})
      .then(mascotas => res.render('mascotas/listaMascotas', {mascotas})).catch( err => next(err))
  })
  //END PET CRUD

  //ADOPTION

  router.get('/adopcion/new', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    res.render('adopcion/new')
  })

  router.post('/adopcion', ensureLogin.ensureLoggedIn(), (req, res, next) => {

    const {pet_id, mensaje, fecha_solicitud} = req.body

    const newAdopcion = new Adopcion({ 
      mensaje,
      fecha_solicitud,
      pet_id,
      user_id: req.user._id})

    newAdopcion.save()
      .then(adopcion => 
        //actualizamos el status de la mascota
        Mascotas.updateOne({ _id: pet_id}, {status: 2}).then(() => {
          res.redirect(301, '/mascotas')
        }).catch(err => next(err)))
      .catch(err => next(err))
  })

  router.get('/adopcion/:id', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    let idAdopcion = req.params.id
    Adopcion.findOne({ _id: idAdopcion }).then(adopcion => {
      res.render('adopcion/show', { adopcion })
    }).catch(err => console.log(err))
  })

  router.get('/adopcion', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    Adopcion.find()
      .then(adopcion => {
        res.render('adopcion/listaAdopcion', { adopcion })
      })
  })
  
  router.get('/adopcion/my_adoptions', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    Adopcion.find({user_id: req.user._id})
    .then(adoptions => {
      res.render('adopcion/misPeticiones', { adoptions})
    }).catch(err => next(err))
  })
  //END ADOPTION

  //USER PROFILE
  router.get('/profile', ensureLogin.ensureLoggedIn(), (req, res, next) => {
    res.json({name: req.user.nombre})
  })
  //END USER PROFILE
/* END PRIVATE ROUTES */
/*
router.get('/usuario/:id', (req, res) => {
  let idAUsuarios = req.params.id
  Usuarios.findOne({ _id: idUsuarios }).then(usuarios => {
    res.render('usuario/show', { usuarios})
  }).catch(err => console.log(err))
})


router.get('/usuario', (req, res) => {
  Usuarios.find()
    .then(usuarios => {
      res.render('usuario/listaUsuarios', {usuarios})
    })
})*/

module.exports = router;
