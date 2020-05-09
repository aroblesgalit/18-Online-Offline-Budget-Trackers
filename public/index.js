let transactions = [];
let myChart;

fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(async function (data) {

    const indexedDB = await getIndexedDB();
    console.log(indexedDB);

    // Make a post request
    fetch("/api/transaction/bulk", {
      method: "POST",
      body: JSON.stringify(indexedDB),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json"
      }
    }).then(response => {
      return response.json();
    })
      .then(data => {
        console.log("Database successfull added!");
        // Clear out indexedDB
        clearIndexedDB();
      })
      .catch(err => {
        console.log("Still no database connection.")
      })
    // save db data on global variable
    transactions = [...indexedDB.reverse(), ...data];

    populateTotal();
    populateTable();
    populateChart();
  });

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: "Total Over Time",
        fill: true,
        backgroundColor: "#6666ff",
        data
      }]
    }
  });
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();

  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      if (data.errors) {
        errorEl.textContent = "Missing Information";
      }
      else {
        // clear form
        nameEl.value = "";
        amountEl.value = "";
      }
    })
    .catch(_err => {
      // fetch failed, so save in indexed db
      saveRecord(transaction);

      // clear form
      nameEl.value = "";
      amountEl.value = "";
    });
}

document.querySelector("#add-btn").onclick = function () {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function () {
  sendTransaction(false);
};

// Function to save record into IndexedDB
function saveRecord(expenseItem) {
  // console.log(expenseItem);
  const request = window.indexedDB.open("expense", 1);

  // Create schema
  request.onupgradeneeded = event => {
    const db = event.target.result;

    // Create a expense object store with a listID keyPath that can be used to query on.
    const expenseStore = db.createObjectStore("expense", { keyPath: "date" });
    // Create an index for "column" to query on.
    expenseStore.createIndex("nameIndex", "name");
    expenseStore.createIndex("valueIndex", "value");
  }

  // Create variables for a new transaction on the database, objectStore and the index.
  request.onsuccess = () => {
    const db = request.result;
    // console.log(db);
    const transaction = db.transaction(["expense"], "readwrite");
    const expenseStore = transaction.objectStore("expense");
    // const nameIndex = expenseStore.index("nameIndex");
    // const valueIndex = expenseStore.index("valueIndex");

    // Add expense item to our expenseStore
    expenseStore.add({ date: expenseItem.date, name: expenseItem.name, value: expenseItem.value });
  };
};

function clearIndexedDB() {
  const request = window.indexedDB.open("expense", 1);

  // Create schema
  request.onupgradeneeded = event => {
    const db = event.target.result;

    // Create a expense object store with a listID keyPath that can be used to query on.
    const expenseStore = db.createObjectStore("expense", { keyPath: "date" });
    // Create an index for "column" to query on.
    expenseStore.createIndex("nameIndex", "name");
    expenseStore.createIndex("valueIndex", "value");
  }

  request.onsuccess = () => {
    const db = request.result;

    const transaction = db.transaction(["expense"], "readwrite");
    const expenseStore = transaction.objectStore("expense");

    const clearRequest = expenseStore.clear();
    clearRequest.onsuccess = () => {
      console.log("IndexedDB has been cleared!");
    }
  }
}

// Function to grab data from IndexedDB
function getIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("expense", 1);

    // Create schema
    request.onupgradeneeded = event => {
      const db = event.target.result;

      // Create a expense object store with a listID keyPath that can be used to query on.
      const expenseStore = db.createObjectStore("expense", { keyPath: "date" });
      // Create an index for "column" to query on.
      expenseStore.createIndex("nameIndex", "name");
      expenseStore.createIndex("valueIndex", "value");
    }

    request.onsuccess = () => {
      const db = request.result;

      const transaction = db.transaction(["expense"], "readwrite");
      const expenseStore = transaction.objectStore("expense");

      const getRequest = expenseStore.getAll();
      getRequest.onsuccess = () => {
        return resolve(getRequest.result);
      }
    }
  })
}

