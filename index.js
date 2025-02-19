const express = require('express');
const res = require('express/lib/response');
const hbs = require('hbs');
const { createConnection } = require('mysql2/promise');
const wax = require('wax-on'); // <-- template inheritance
const helpers = require('handlebars-helpers')();
require('dotenv').config();

hbs.registerHelper(helpers);

// create an express application
const app = express();

// set hbs
app.set('view engine', 'hbs'); // we're using hbs as the view engine
wax.on(hbs.handlebars);
wax.setLayoutPath('./views/layouts'); // tell wax-on where to the find the layout files
// layout files are hbs files that have elements which can be shared among other hbs files

let connection = null; // create an empty variable named connection

// setup form processing
app.use(express.urlencoded({
    extended: false
}))

async function main() {
    // creating a connect is an asynchronous operation
    // -> an async operation is one where NodeJS won't wait for it to finish
    // before executing the next line of code
    connection = await createConnection({
        'host': process.env.DB_HOST,
        'user': process.env.DB_USER,
        'database': process.env.DB_DATABASE,
        'password': process.env.DB_PASSWORD
    });  // createConnection takes a long time to finish
    // usually JS will just skip this line and move on to the next
    // but we don't want so we use await to make sure the connection finishes
    // creating before moving on to the next line

    // we want the connection to the database to be finished before defining the routes

    app.get("/", function (req, res) {
        res.render('home')
    });


    app.get('/test', function (req, res) {
        res.render('test-file');
    });

    app.get('/customers', async function (req, res) {
        // const results = await connection.execute(`
        //     SELECT * FROM Customers
        //         JOIN Companies
        //     ON Customers.company_id = Companies.company_id;
        // `);
        // const customers = results[0];

        // Use array destructuring to extract out the first element of the
        // results array into the customers array
        const firstName = req.query.first_name;
        const lastName = req.query.last_name;
        const ratings = req.query.ratings;


        let sql =`
            SELECT * FROM Customers
                JOIN Companies
            ON Customers.company_id = Companies.company_id WHERE 1
        `
        const bindings = [];

        // if the firstName variable is given a truthify value
        // (in other words, not null, not undefined, not '', not 0, not false)
        if (firstName) {
            sql += " AND first_name LIKE ?";
            bindings.push('%' + firstName + '%')
        }

        if (lastName) {
            sql += " AND last_name LIKE ?";
            bindings.push('%' + lastName + '%')
        }

        if (ratings) {
            sql += " AND rating >= ?";
            bindings.push(ratings)
        }


        const [customers] = await connection.execute(sql, bindings);

        res.render('customers', {
            'allCustomers': customers,
            'searchParams': req.query
        })
    });

    // one route to display the form
    // one route to process the form
    app.get('/customers/create', async (req, res) => {
        let [companies] = await connection.execute('SELECT * from Companies');
        let [employees] = await connection.execute('SELECT * from Employees');
        res.render('customers/create', {
            'companies': companies,
            'employees': employees
        })
    });

    app.post('/customers/create', async (req, res) => {
        // to extract data from a form, we will
        // use the name of the field as a key in req.body
        const firstName = req.body.first_name;
        const lastName = req.body.last_name;
        const rating = req.body.rating;
        const companyId = req.body.company_id;

        const bindings = [firstName, lastName, rating, companyId]

        // use a prepared statement to insert rows -- a secured way to prevent MySQL injection attacks
        await connection.execute(`
            INSERT INTO Customers (first_name, last_name, rating, company_id)
            VALUES (?, ?, ?, ? );
        `, bindings);

        // tell the browser to go a different URL
        res.redirect('/customers');
    })

    app.get('/customers/:customer_id/edit', async function (req, res) {
        let [customers] = await connection.execute('SELECT * FROM Customers WHERE customer_id = ?', [req.params.customer_id]);
        let [companies] = await connection.execute('SELECT * FROM Companies');
        let customer = customers[0];
        res.render('customers/edit', {
            'customer': customer,
            'companies': companies
        })
    })

    app.post('/customers/:customer_id/edit', async function (req, res) {
        let { first_name, last_name, rating, company_id } = req.body;
        let query = 'UPDATE Customers SET first_name=?, last_name=?, rating=?, company_id=? WHERE customer_id=?';
        let bindings = [first_name, last_name, rating, company_id, req.params.customer_id];
        await connection.execute(query, bindings);
        res.redirect('/customers');
    })

    app.get('/customers/:customer_id/delete', async function (req, res) {
        // display a confirmation form 
        const [customers] = await connection.execute(
            "SELECT * FROM Customers WHERE customer_id =?", [req.params.customer_id]
        );
        const customer = customers[0];

        res.render('customers/delete', {
            customer
        })

    })

    app.post('/customers/:customer_id/delete', async function (req, res) {
        await connection.execute(`DELETE FROM Customers WHERE customer_id = ?`, [req.params.customer_id]);
        res.redirect('/customers');
    })

    app.get('/employees', async function (req, res) {
        const [employees] = await connection.execute(`
            SELECT * FROM Employees
            JOIN Departments 
            ON Employees.department_id = Departments.department_id
        `);

        res.render('employees', {
            'allEmployees': employees
        })
    });

    app.get('/employees/create', async function (req, res) {
        let [departments] = await connection.execute('SELECT * from Departments');
        let [employees] = await connection.execute('SELECT * from Employees');
        res.render('employees/create', {
            'departments': departments,
            'employees': employees
        })
    });

    app.post('/employees/create', async function (req, res) {
        let { first_name, last_name, department_id } = req.body;
        let query = 'INSERT INTO Employees (first_name, last_name, department_id) VALUES (?, ?, ?)';
        let bindings = [first_name, last_name, department_id];
        let [result] = await connection.execute(query, bindings);

        res.redirect('/employees');
    })

    app.get('/employees/:employee_id/edit', async function (req, res) {
        let [employees] = await connection.execute('SELECT * FROM Employees WHERE employee_id =?', [req.params.employee_id]);
        let [departments] = await connection.execute('SELECT * FROM Departments');
        let employee = employees[0];
        res.render('employees/edit', {
            'employee': employee,
            'departments': departments
        })
    })

    app.post('/employees/:employee_id/edit', async function (req, res) {
        let { first_name, last_name, department_id } = req.body;
        let query = 'UPDATE Employees SET first_name=?, last_name=?, department_id=? WHERE employee_id=?';
        let bindings = [first_name, last_name, department_id, req.params.employee_id];
        await connection.execute(query, bindings);
        res.redirect('/employees');
    })

    app.get('/employees/:employee_id/delete', async function (req, res) {
        // display a confirmation form 
        const [employees] = await connection.execute(
            "SELECT * FROM Employees WHERE employee_id =?", [req.params.employee_id]
        );
        const employee = employees[0];

        res.render('employees/delete', {
            employee
        })
    })

    app.post('/employees/:employee_id/delete', async function (req, res) {
        await connection.execute(`DELETE FROM Employees WHERE employee_id = ?`, [req.params.employee_id]);
        res.redirect('/employees');
    })
}
main();


// start the server
app.listen(3000, function () {
    console.log("Server has started")
})

