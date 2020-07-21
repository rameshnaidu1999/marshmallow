const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const formidable = require('express-formidable');
app.use(formidable());

const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;

var http = require('http').createServer(app);
const bcrypt = require('bcrypt');
const fileSystem = require("fs");

var jwt = require("jsonwebtoken");
var accessTokenSecret = "myAccessTokenSecret1234567890";

app.use(expressLayouts);
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

var socketIO = require("socket.io")(http);
var socketID = "";
var users = [];


var mainURL = "http://localhost:5000";
socketIO.on("connection", function(socket, err){
    console.log("User connected", socket.id);
    if(err) throw err;
    socketID = socket.id;  
});

http.listen(5000, function(){
    console.log("Server started on port 5000");
    
    mongoClient.connect("mongodb+srv://Ramesh:ramesh123@cluster0-n5l8y.mongodb.net/test?retryWrites=true&w=majority",{useUnifiedTopology: true, useNewUrlParser: true}, function(err, client){
        var database = client.db("node_blog");
        console.log("Databse connected to node-blog.");

        app.get('/', (req, res) => {
            res.render("home")
        });

        app.get('/home', (req, res) => {
            res.render('home');
        });

        app.get('/blog', (req, res) => {
            res.render('blog');
        });

        


        app.get('/signup', (req, res) => {
            res.render('signup');
        });

        app.post('/signup', (req, res) => {
            var name = req.fields.name;
            var username = req.fields.username;
            var email = req.fields.email;
            var password = req.fields.password;
            var gender = req.fields.gender;

            database.collection("users").findOne({
                $or: [{
                    "email":email
                },{
                    "username": username
                }]
            }, function(error, user){
                if( user == null ) {
                    bcrypt.hash(password,10, function(error,hash){
                        database.collection("users").insertOne({
                            "name": name,
                            "username": username,
                            "email": email,
                            "password": hash,
                            "gender": gender,
                            "profileImage": "",
                            "coverPhoto":"",
                            "dob": "",
                            "city": "",
                            "country": "",
                            "aboutMe": "",
                            "fiends": [],
                            "pages": [],
                            "notifications": [],
                            "groups": [],
                            "posts": []
                        }, function(error, data){
                            res.json({
                                "status": "success",
                                "message": "Registered Successfully.Please Login "
                            })
                        })
                    })
                } else {
                    res.json({
                        "status": "error",
                        "message": "Email already exists."
                    })
                }
            })
        });

        app.get('/login', (req, res) => {
            res.render('login');
        });

        //get User Details		
		app.post("/getUser", function(request, result){
			var accessToken = request.fields.accessToken;			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "user has been Logged out. Please login again."
					});
				} else{
					result.json({
						"status": "success",
						"message": "Record has been fetched.",
						"data": user
					});
				}
			});
		});

        app.post("/login", function(request, result){
            var email = request.fields.email;
            var password = request.fields.password;

            database.collection("users").findOne({
                "email": email
            }, function (error, user ){
                if(user == null) {
                    result.json({
                        "status": "error",
                        "message": "Email does not exist"
                    });
                } else {
                    bcrypt.compare(password, user.password, function(error, isVerify) {
                        if( isVerify ) {
                            var accessToken = jwt.sign({email: email}, accessTokenSecret);
                            database.collection("users").findOneAndUpdate({
                                "email": email
                            }, {
                                $set: {
                                    "accessToken": accessToken
                                }
                            }, function(error, data){
                                result.json({
                                    "status": "success",
                                    "message": "Login successfully",
                                    "accessToken": accessToken,
                                    "profileImage": user.profileImage
                                })
                            })
                        } else {
                            result.json({
                                "status": "error",
                                "message": "Password is not correct"
                            })
                        }
                    })
                }
            })
        });

        app.get("/updateProfile", function(request, result){
            result.render("updateProfile")
        });

        //get User Details		
		app.post("/getUser", function(request, result){
			var accessToken = request.fields.accessToken;			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "user has been Logged out. Please login again."
					});
				} else{
					result.json({
						"status": "success",
						"message": "Record has been fetched.",
						"data": user
					});
				}
			});
		});

        app.get("/logout", function (request, result){
            result.redirect("/login")
        });

		//profile cover photo update
		app.post("/uploadCoverPhoto", function(request, result){
			var accessToken = request.fields.accessToken;
			var coverPhoto = "";
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login  again."
					});
				} else {
					if(request.files.coverPhoto.size > 0 && request.files.coverPhoto.type.includes("image")){
						//previous cover photo remove
						if(user.coverPhoto != ""){
							fileSystem.unlink(user.coverPhoto, function(error){
								
							});
						}
						coverPhoto = "/public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;
						fileSystem.rename(request.files.coverPhoto.path, coverPhoto, function(error){
							
						});
						database.collection("users").updateOne({
								"accessToken": accessToken
							}, {
								$set: {
									"coverPhoto": coverPhoto
								}
						}, function(error, data){
							result.json({
								"status": "status",
								"message": "Cover photo has been updated.",
								"data": mainURL + "/" + coverPhoto
							});
						});							
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});			
        });
        
        //profile image update
		app.post("/uploadProfileImage", function(request, result){
			var accessToken = request.fields.accessToken;
			var profileImage = "";
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login  again."
					});
				} else {
					if(request.files.profileImage.size > 0 && request.files.profileImage.type.includes("image")){
						//previous cover photo remove
						if(user.profileImage != ""){
							fileSystem.unlink(user.profileImage, function(error){
								
							});
						}
						profileImage = "public/images/" + new Date().getTime() + "-" + request.files.profileImage.name;
						fileSystem.rename(request.files.profileImage.path, profileImage, function(error){
							
						});
						database.collection("users").updateOne({
								"accessToken": accessToken
							}, {
								$set: {
									"profileImage": profileImage
								}
						}, function(error, data){
							result.json({
								"status": "status",
								"message": "Profile image has been updated.",
								"data": mainURL + "/" + profileImage
							});
						});							
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});			
        });
        
        //update profile		
        app.post("/updateProfile", function(request, result){
            var accessToken = request.fields.accessToken;
            var name = request.fields.name;
            var dob = request.fields.dob;
            var city = request.fields.city;
            var country = request.fields.country;
            var aboutMe = request.fields.aboutMe;
            
            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error, user){
                if(user == null){
                    result.json({
                        "status": "error",
                        "message": "User has been logged out. Please login aagain."
                    });
                } else {
                    database.collection("users").updateOne({
                        "accessToken": accessToken
                    },{
                        $set: {
                            "name": name,
                            "dob": dob,
                            "city": city,
                            "country": country,
                            "aboutMe": aboutMe
                        }
                    }, function(error, data){
                        result.json({
                            "status": "status",
                            "message": "Profile has been updated."
                        });
                    });
                }
            });
        });
    });
});

//Run app, then load http://localhost:5000 in a browser to see the output.