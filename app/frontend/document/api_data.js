define({ "api": [
  {
    "type": "delete",
    "url": "/api/users/:username",
    "title": "Delete user's account",
    "name": "DeleteUser",
    "group": "User",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of user.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/frontend/apiDoc/api.js",
    "groupTitle": "User",
    "error": {
      "fields": {
        "Unauthorized 401": [
          {
            "group": "Unauthorized 401",
            "optional": false,
            "field": "401",
            "description": "<p>No access right.</p>"
          }
        ],
        "Forbidden 403": [
          {
            "group": "Forbidden 403",
            "optional": false,
            "field": "403",
            "description": "<p>The user might not have the necessary permissions for a resource.</p>"
          }
        ],
        "Internal Server Error 500": [
          {
            "group": "Internal Server Error 500",
            "optional": false,
            "field": "500",
            "description": "<p>The generic something has gone wrong.</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/api/users/:username",
    "title": "Get User information",
    "name": "GetUser",
    "group": "User",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of user.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -i http://croissant.cms-weblab.utsc.utoronto.ca/",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "_id",
            "description": "<p>Id of each user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "salt",
            "description": "<p>Salt string of user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "saltedHash",
            "description": "<p>Salted Hash string of user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Time when user was created.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Latest time when the information was updated.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/frontend/apiDoc/api.js",
    "groupTitle": "User",
    "error": {
      "fields": {
        "Bad Request 400": [
          {
            "group": "Bad Request 400",
            "optional": false,
            "field": "400",
            "description": "<p>The user input is invalid.</p>"
          }
        ],
        "Unauthorized 401": [
          {
            "group": "Unauthorized 401",
            "optional": false,
            "field": "401",
            "description": "<p>No access right.</p>"
          }
        ],
        "Forbidden 403": [
          {
            "group": "Forbidden 403",
            "optional": false,
            "field": "403",
            "description": "<p>The user might not have the necessary permissions for a resource.</p>"
          }
        ],
        "Internal Server Error 500": [
          {
            "group": "Internal Server Error 500",
            "optional": false,
            "field": "500",
            "description": "<p>The generic something has gone wrong.</p>"
          }
        ]
      }
    }
  },
  {
    "type": "get",
    "url": "/api/users",
    "title": "Get all existing users",
    "name": "GetUsers",
    "group": "User",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -i http://croissant.cms-weblab.utsc.utoronto.ca/",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "users",
            "description": "<p>Lists of all existing users.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "users._id",
            "description": "<p>Id of each user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "users.username",
            "description": "<p>Username of each user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "users.salt",
            "description": "<p>Salt string of each user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "users.saltedHash",
            "description": "<p>Salted Hash string of each user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "users.createdAt",
            "description": "<p>Time when each user was created.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "users.updatedAt",
            "description": "<p>Latest time when the information was updated.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/frontend/apiDoc/api.js",
    "groupTitle": "User",
    "error": {
      "fields": {
        "Bad Request 400": [
          {
            "group": "Bad Request 400",
            "optional": false,
            "field": "400",
            "description": "<p>The user input is invalid.</p>"
          }
        ],
        "Unauthorized 401": [
          {
            "group": "Unauthorized 401",
            "optional": false,
            "field": "401",
            "description": "<p>No access right.</p>"
          }
        ],
        "Forbidden 403": [
          {
            "group": "Forbidden 403",
            "optional": false,
            "field": "403",
            "description": "<p>The user might not have the necessary permissions for a resource.</p>"
          }
        ]
      }
    }
  },
  {
    "type": "post",
    "url": "/api/signin",
    "title": "Sign in to the website",
    "name": "Signin",
    "group": "User",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of user.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>Password os user's account.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/frontend/apiDoc/api.js",
    "groupTitle": "User",
    "error": {
      "fields": {
        "Bad Request 400": [
          {
            "group": "Bad Request 400",
            "optional": false,
            "field": "400",
            "description": "<p>The user input is invalid.</p>"
          }
        ],
        "Internal Server Error 500": [
          {
            "group": "Internal Server Error 500",
            "optional": false,
            "field": "500",
            "description": "<p>The generic something has gone wrong.</p>"
          }
        ]
      }
    }
  },
  {
    "type": "put",
    "url": "/api/signup",
    "title": "Sign up a new user account",
    "name": "Signup",
    "group": "User",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of user.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>Password os user's account.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "confirmPassword",
            "description": "<p>Confirm password of user's account.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "_id",
            "description": "<p>Id of each user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "salt",
            "description": "<p>Salt string of user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "saltedHash",
            "description": "<p>Salted Hash string of user.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Time when user was created.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Latest time when the information was updated.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/frontend/apiDoc/api.js",
    "groupTitle": "User",
    "error": {
      "fields": {
        "Conflict 409": [
          {
            "group": "Conflict 409",
            "optional": false,
            "field": "409",
            "description": "<p>The request could not be processed because of conflict in the request.</p>"
          }
        ],
        "Internal Server Error 500": [
          {
            "group": "Internal Server Error 500",
            "optional": false,
            "field": "500",
            "description": "<p>The generic something has gone wrong.</p>"
          }
        ]
      }
    }
  },
  {
    "type": "patch",
    "url": "/api/users/:username",
    "title": "Update user's password",
    "name": "UpdatePassword",
    "group": "User",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username of user.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "app/frontend/apiDoc/api.js",
    "groupTitle": "User",
    "error": {
      "fields": {
        "Unauthorized 401": [
          {
            "group": "Unauthorized 401",
            "optional": false,
            "field": "401",
            "description": "<p>No access right.</p>"
          }
        ],
        "Forbidden 403": [
          {
            "group": "Forbidden 403",
            "optional": false,
            "field": "403",
            "description": "<p>The user might not have the necessary permissions for a resource.</p>"
          }
        ],
        "Internal Server Error 500": [
          {
            "group": "Internal Server Error 500",
            "optional": false,
            "field": "500",
            "description": "<p>The generic something has gone wrong.</p>"
          }
        ]
      }
    }
  }
] });
