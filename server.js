const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
require('dotenv').config();

const port = process.env.SERVER_PORT || 3000;

const con = mysql.createConnection({
  host: process.env.MYSQL_DB_HOST,
  user: process.env.MYSQL_DB_USER,
  password: process.env.MYSQL_DB_PASS,
  database: process.env.MYSQL_DB_NAME,
  port: process.env.MYSQL_DB_PORT,
});

con.connect((err) => {
  if (err) throw err;
  console.log('Successfully connected to DB');
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/students', (req, res) => {
  con.query(`SELECT * FROM students`, (err, result) => {
    if (err) {
      res.status(400).json(err);
    } else {
      res.json(result);
    }
  });
});
app.get('/view', (req, res) => {
  con.query(`SELECT * FROM attendency`, (err, result) => {
    if (err) {
      res.status(400).json(err);
    } else {
      res.json(result);
    }
  });
});

function timeValidate(date) {
  const dateVal = new Date(date);
  return (
    dateVal.getHours() >= 18 &&
    dateVal.getHours() < 22 &&
    dateVal.getDay() >= 1 &&
    dateVal.getDay() < 5
  );
}

function registerValidator(id, res, callback) {
  con.query(
    `SELECT * FROM attendency WHERE DATE(timestamp) = CURDATE()`,
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        callback(
          id,
          res,
          result.some((v) => v.studentId == id)
        );
      }
    }
  );
}

function postAttend(studentId, res, validator) {
  console.log(validator);
  const date = new Date().toLocaleString('lt-LT', {
    timeZone: 'Europe/Vilnius',
  });
  if (validator) {
    res.status(400).json({ message: 'Already Registered!' });
  } else {
    if (studentId && timeValidate(date)) {
      con.query(
        `INSERT INTO attendency (studentId) VALUES ('${studentId}')`,
        (err, result) => {
          if (err) {
            res
              .status(400)
              .send(
                'The DB has not added any records due to an internal problem'
              );
          } else {
            res.status(201).send('Successfully added');
          }
        }
      );
    } else {
      res
        .status(400)
        .send(
          'The information provided is not correct or you are trying to add attendency when it is disabled.'
        );
    }
  }
}
app.post('/add-attendency', (req, res) => {
  const studentId = req.body.studentId;

  registerValidator(studentId, res, postAttend);
});

app.get('/', (req, res) => {
  res.send('This boilerplate is working!');
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
