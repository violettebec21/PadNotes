var db = require("../models");
var passport = require("../config/passport");
var isAuthenticated = require("../config/middleware/isAuthenticated");
var op = db.sequelize.Op
module.exports = function(app) {
  // Route to handle login attempts. Using passport's local authentication strategy
  // user will be served content based on wether the authentication was successful or not
  app.post("/user/login", passport.authenticate("local"), function(req, res) {
    console.log("redirecting...")
    //after the user is logged in, ifthey have a group they will be redirected to their home,
    //if they don't have a group, they will be redirected to page where they can make a group 
    //or request to join an existing one 
    if(req.user.GroupId){
      res.json("home");
    }
    else{
      res.json("groupJoin")
    }

  });
  //route for handling new user account creation requests. It will use the requirements and methods 
  //given in the user.js model to attempt to insert a new user record into the Users table of the database
  //if the user account is succesfully created, then the user will automatically be loged in via the 'user/login/' route
  app.post("/new-user/signup", function(req, res){
    console.log(req.body);
    db.User.create({
      email: req.body.email,
      password: req.body.password,
      name: req.body.name
    })
    //after succesfully creating the row for the new user, they will be redierected through the user/login route with their credentials
    .then(function(){
      res.redirect(307,  "/user/login")
    }).catch(function(error){
      console.log(error);
      res.json(error);  
    })
  })
  //the route for creating new groups. It will get a groupName from the client, and then assign the 
  //id of the user who created the group to the new entry. It will send the data for the new group back to the client
  app.post("/groups/create", function(req, res){
    console.log(req);
    db.Group.create({
      groupName: req.body.groupName,
      creatorId: req.user.id
    })
    .then(function(data){
      console.log("data id ", data.dataValues.id);
      res.send(data);
    })
    .catch(function(error){
      console.log(error);
      res.json(error);
    })
  });
  //this route should be hit after a user creates or joins a group. They will be given a group id from the group they created/
  //joined
  app.put("/user", function(req, res){
    console.log("updating user");
    db.User.update(req.body, 
      {
        where: {
          id: req.user.id
        }
    }).then(function(data){
        //updating the session user GroupId
        req.user.GroupId = req.body.GroupId;
        //redirecting the user to their home page
        return res.status(200).send({result: 'redirect', url:'/home'})
      })

  })

  app.get("/messages",isAuthenticated, function(req,res){
    var hdbsObj = {
      messages: "",
      users: ""
    }
    db.Message.findAll({
      where: {
        recepientId: req.user.id
      }
    }).then(function(messageData){
      hdbsObj.messages = messageData
      })
    db.User.findAll({
      attributes: ['name'],
    }).then(function(userData){
      hdbsObj.users = userData
      res.render("messages", hdbsObj);
    });
  })

  app.post("/messages", isAuthenticated, function(req, res){
    db.Message.create({
      subject: req.body.subject,
      body: req.body.body,
      type: req.body.type,
      senderName: req.user.name,
      senderId: req.user.id,
      recepientId: req.body.recepientId
    }).then(function (data){
      res.end();
    })
  })

  app.get("/groups/:groupName", isAuthenticated, function(req, res){
    console.log(req.params)
    db.Group.findAll({
      where:{
        groupName: {
          [op.like]: '%'+ req.params.groupName + '%'
        }
      }
    }).then(function(groupData){
      res.json(groupData)
    })
  })
  app.get("/groups/", isAuthenticated, function(req, res){
    db.Group.findAll({})
      .then(function(groupData){
        res.json(groupData)
      })
  })

  app.put("/request/join/accept", isAuthenticated, function(req, res){
    db.Message.findOne({
      where: {
        id: req.body.id
      }
    }).then(function(messageData){
      //just to make sure, check to see that the user's id is the same as the message's recepeint id
      if(req.user.id === messageData.recepientId){
        console.log("req gId ", req.user.GroupId)
        db.User.update({
          GroupId: req.user.GroupId
        },{
          where: {
            id: messageData.senderId
          }
        });
      }
    })
  })
  
};
