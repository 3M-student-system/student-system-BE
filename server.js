const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SG_API_KEY);

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
  con.query(
    `SELECT * FROM attendance ORDER BY timestamp ASC`,
    (err, result) => {
      if (err) {
        res.status(400).json(err);
      } else {
        res.json(result);
      }
    }
  );
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
    `SELECT * FROM attendance WHERE DATE(timestamp) = CURDATE()`,
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
function passGenerator() {
  let day = String(new Date().getDate());
  if (day < 10) {
    day = Number('0' + day);
  }

  const abc = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'I'];
  const passVal = day.split('');
  let genPass = '';
  passVal.forEach((element) => {
    genPass += abc[Number(element)];
  });

  return genPass;
}

function postAttend(studentId, res, validator) {
  const date = new Date().toLocaleString('lt-LT', {
    timeZone: 'Europe/Vilnius',
  });

  if (validator) {
    res.status(400).json({ message: 'Already Registered!' });
  } else {
    if (studentId && timeValidate(date)) {
      con.query(
        `INSERT INTO attendance (studentId) VALUES ('${studentId}')`,
        (err, result) => {
          if (err) {
            res.status(403).json({
              message:
                'The DB has not added any records due to an internal problem',
            });
          } else {
            res.status(201).json({ message: 'Successfully added' });
            con.query(
              `SELECT email, name FROM students WHERE id = '${studentId}'`,
              (err, result) => {
                if (err) throw err;
                sgMail
                  .send({
                    to: result[0].email,
                    from: 'm.sakenis@gmail.com',
                    subject: `${result[0].name}, thank you for registration!`,
                    text: `Your registration have been submitted successfully on ${date}`,
                  })
                  .then(() => console.log('email sent'))
                  .catch((err) => res.status(400).send(err));
              }
            );
          }
        }
      );
    } else {
      res.status(403).json({
        message:
          'The information provided is not correct or you are trying to add attendance when it is disabled.',
      });
    }
  }
}

app.post('/add-attendance', (req, res) => {
  const studentId = req.body.studentId;
  if (req.body.password === passGenerator()) {
    registerValidator(studentId, res, postAttend);
  } else {
    res.status(401).json({ message: 'Wrong Password!' });
  }
});

app.post('/add-student', (req, res) => {
  if (req.body.password === 'PetrasMyliLietuva') {
    if (req.body.name && req.body.surname && req.body.email) {
      con.query(
        `INSERT INTO students (name, surname, email, image) VALUES ('${req.body.name}','${req.body.surname}','${req.body.email}', '${req.body.image}')`,
        (err, result) => {
          if (err) {
            res.status(400).json({
              message:
                'The DB has not added any records due to an internal problem',
            });
          } else {
            res.status(201).json({ message: 'Successfully added' });
          }
        }
      );
    } else {
      res.status(400).json({
        message:
          'The information provided is not correct or you are trying to add attendance when it is disabled.',
      });
    }
  } else {
    res.status(401).json({ message: 'Wrong Password' });
  }
});

app.get('/', (req, res) => {
  res.send('This boilerplate is working!');
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
