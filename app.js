require('dotenv').config()
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();
const supabase = require('./supabase')



const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });




app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}));


app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
   
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success')
  res.locals.error = req.flash('error')
  next()
})


const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};



// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 4) {
        req.flash('error', 'Password should be at least 4 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Define routes
app.get('/', async(req, res) => {
    
    res.render('index', {user: req.session.user} );
});

app.get('/inventory', checkAuthenticated, checkAdmin, async(req, res) => {
    
    const {data,error}= await supabase
    .from("Items")
    .select('*')

    if(error){
        console.log(error)
    }
    if(data){
         res.render('inventory', { products: data, user: req.session.user });
    }
     
    ;
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/register', validateRegistration, async(req, res) => {

    const { name, email, password,role } = req.body;
    const {data,error} = await supabase
    .from("Users").insert({
        name:name,email:email,password:password,role:role
    })
    if(error){
        console.log(error)
    }else{
        console.log('registered successfully')
        res.redirect('/login')
    }

    
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', async(req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
    
    const {data,error} = await supabase
    .from("Users")
    .select('*')
    .eq('email',email)
    .eq('password',password)
    console.log(data)
    if(error){
        console.log(error)
    }else{
        req.session.user = data[0]
        console.log('session',req.session.user)
        res.redirect('./inventory')
    }
    
});

app.get('/shopping', checkAuthenticated, async(req, res) => {
    const {data,error} = await supabase
    .from("Items")
    .select("*")
    if(error){
        console.log(error)
    }else{
        res.render("shopping",{user:req.session.user,products:data})
    }

});
session.cart = [] || session.cart
var cart = session.cart
app.post('/add-to-cart/:id', checkAuthenticated, async(req, res) => {
    const productId = parseInt(req.params.id);
    
    const {data,error} = await supabase
    .from("Items").select("*").eq("id",productId)
    if(error){
        console.log(error)
    }
    else{
        data[0].quantity = 1
        cart.push(data[0])
        console.log('added to cart')
        req.flash('success',"Added to cart successfully!")
        res.redirect('/shopping')
    }

        
    });
;

app.get('/cart', checkAuthenticated, (req, res) => {
    
    res.render('cart', { cart:session.cart, user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/product/:id', checkAuthenticated, async(req, res) => {

    const productId = req.params.id;
    const {data,error} = await supabase
    .from("Items")
    .select("*")
    .eq("id",productId)
    if(error){
        console.log(error)
    }else{
        res.render('product',{product:data[0],user:req.session.user})
    }

});

app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', {user: req.session.user } ); 
});

app.post('/addProduct',  async(req, res) => {
    console.log(req.body.name)
    const {name,quantity,price,image} = req.body
    const {data,error} = await supabase
    .from("Items")
    .insert({
        name:name,quantity:quantity,price:price,image:image
    })
    if(error){
        console.log(error)
    }
    else{
        console.log("added new item successfully")
        res.redirect("/inventory")
    }
});

app.get('/updateProduct/:id',checkAuthenticated, checkAdmin, async(req,res) => {
    const productId = req.params.id;
    const {data,error} = await supabase
    .from('Items')
    .select('*')
    .eq("id",productId)
    if(error){
        console.log(error)
    }else{
        res.render("updateProduct",{user:req.session.user,product:data[0]})
    }
});

app.post('/updateProduct/:id', async(req, res) => {
   const productid = req.params.id
   const {name,quantity,price,image} = req.body
   const{data,error} = await supabase
   .from("Items")
   .update({
    name:name,quantity:quantity,price:price,image:image
   }).eq("id",productid)
   if(error){
    console.log(error)
   }else{
    console.log('updated successfully')
    res.redirect('/inventory')
   }
});

app.get('/deleteProduct/:id', async(req, res) => {
    const productId = req.params.id;

    const {data,error} = await supabase
    .from('Items')
    .delete()
    .eq("id",productId)
    if(error){
        console.log(error)
    }
    else{
        console.log('deleted successfully')
        res.redirect('/inventory')
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
