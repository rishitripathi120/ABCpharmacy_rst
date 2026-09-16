let medicines = [];

document.addEventListener("DOMContentLoaded", () => {
    loadMedicines();
    loadSales();

    document
        .getElementById("searchInput")
        .addEventListener("input", searchMedicines);
});

// ===============================
// Medicine
// ===============================

async function loadMedicines() {
    try {
        const response = await fetch("/api/Medicines");

        if (!response.ok) {
            throw new Error("Unable to load medicines.");
        }

        medicines = await response.json();

        displayMedicines(medicines);
    }
    catch (error) {
        showMessage(error.message, true);
    }
}

function displayMedicines(data) {
    const tableBody =
        document.getElementById("medicineTableBody");

    tableBody.innerHTML = "";

    data.forEach(medicine => {

        const row = document.createElement("tr");

        // Expiry gets priority over low stock
        if (isExpiringSoon(medicine.expiryDate)) {
            row.classList.add("expiring");
        }
        else if (medicine.quantity < 10) {
            row.classList.add("low-stock");
        }

        row.innerHTML = `
            <td>${escapeHtml(medicine.fullName)}</td>
            <td>${escapeHtml(medicine.brand)}</td>
            <td>${formatDate(medicine.expiryDate)}</td>
            <td>${medicine.quantity}</td>
            <td>₹${Number(medicine.price).toFixed(2)}</td>
            <td>
                <button onclick="sellMedicine(${medicine.id})">
                    Sell
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

function isExpiringSoon(expiryDate) {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);

    expiry.setHours(0, 0, 0, 0);

    const difference =
        expiry.getTime() - today.getTime();

    const days =
        difference / (1000 * 60 * 60 * 24);

    return days >= 0 && days < 30;
}

function formatDate(date) {

    return new Date(date).toLocaleDateString("en-IN");
}

// ===============================
// Search
// ===============================

function searchMedicines() {

    const searchText =
        document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();

    if (!searchText) {
        displayMedicines(medicines);
        return;
    }

    const filteredMedicines =
        medicines.filter(medicine => medicine.fullName
                .toLowerCase()
            .includes(searchText) || medicine.brand
                .toLowerCase()
                .includes(searchText)
        );

    displayMedicines(filteredMedicines);
}

// ===============================
// Add Medicine
// ===============================

function showAddMedicineForm() {

    document
        .getElementById("medicineForm")
        .classList.remove("hidden");
}

function hideAddMedicineForm() {

    document
        .getElementById("medicineForm")
        .classList.add("hidden");
}

async function addMedicine(event) {

    event.preventDefault();

    const fullName =
        document.getElementById("fullName").value.trim();

    const notes =
        document.getElementById("notes").value.trim();

    const expiryDate =
        document.getElementById("expiryDate").value;

    const quantity =
        Number(document.getElementById("quantity").value);

    const price =
        Number(document.getElementById("price").value);

    const brand =
        document.getElementById("brand").value.trim();

    // Basic client-side validation
    if (!fullName) {
        showMessage("Medicine name is required.", true);
        return;
    }

    if (!expiryDate) {
        showMessage("Expiry date is required.", true);
        return;
    }

    if (quantity < 0) {
        showMessage("Quantity cannot be negative.", true);
        return;
    }

    if (price < 0) {
        showMessage("Price cannot be negative.", true);
        return;
    }

    if (!brand) {
        showMessage("Brand is required.", true);
        return;
    }

    const medicine = {
        fullName: fullName,
        notes: notes,
        expiryDate: expiryDate,
        quantity: quantity,
        price: price,
        brand: brand
    };

    try {

        const response = await fetch("/api/Medicines", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(medicine)
        });

        if (!response.ok) {

            const error =
                await response.text();

            throw new Error(
                error || "Unable to add medicine."
            );
        }

        showMessage("Medicine added successfully.");

        document
            .querySelector("#medicineForm form")
            .reset();

        hideAddMedicineForm();

        await loadMedicines();
    }
    catch (error) {

        showMessage(
            "Unable to add medicine: " + error.message,
            true
        );
    }
}

// ===============================
// Sales
// ===============================

async function sellMedicine(medicineId) {

    const medicine =
        medicines.find(x => x.id === medicineId);

    if (!medicine) {
        showMessage("Medicine not found.", true);
        return;
    }

    if (medicine.quantity <= 0) {
        showMessage("Medicine is out of stock.", true);
        return;
    }

    const quantity =
        Number(
            prompt(
                `Enter quantity to sell.\nAvailable stock: ${medicine.quantity}`
            )
        );

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showMessage(
            "Please enter a valid quantity.",
            true
        );
        return;
    }

    if (quantity > medicine.quantity) {
        showMessage(
            `Only ${medicine.quantity} units are available.`,
            true
        );
        return;
    }

    try {

        const response = await fetch("/api/Sales", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                medicineId: medicineId,
                quantity: quantity
            })
        });

        if (!response.ok) {

            const error =
                await response.text();

            throw new Error(
                error || "Unable to complete sale."
            );
        }

        const sale = await response.json();

        showMessage(
            `Sale completed. Total amount: ₹${Number(sale.totalAmount).toFixed(2)}`
        );

        // Refresh stock
        await loadMedicines();

        // Refresh sales history
        await loadSales();
    }
    catch (error) {

        showMessage(
            "Unable to complete sale: " + error.message,
            true
        );
    }
}

// ===============================
// Sales History
// ===============================

async function loadSales() {

    try {

        const response =
            await fetch("/api/Sales");

        if (!response.ok) {
            throw new Error("Unable to load sales.");
        }

        const sales =
            await response.json();

        displaySales(sales);
    }
    catch (error) {

        showMessage(error.message, true);
    }
}

function displaySales(sales) {

    const tableBody =
        document.getElementById("salesTableBody");

    tableBody.innerHTML = "";

    sales.forEach(sale => {

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(sale.medicineName)}</td>
            <td>${sale.quantity}</td>
            <td>₹${Number(sale.unitPrice).toFixed(2)}</td>
            <td>₹${Number(sale.totalAmount).toFixed(2)}</td>
            <td>${formatDate(sale.saleDate)}</td>
        `;

        tableBody.appendChild(row);
    });
}

// ===============================
// Messages
// ===============================

function showMessage(message, isError = false) {

    const messageElement =
        document.getElementById("message");

    messageElement.textContent = message;

    messageElement.style.color =
        isError ? "red" : "green";

    setTimeout(() => {
        messageElement.textContent = "";
    }, 3000);
}

// ===============================
// Small helper
// ===============================

function escapeHtml(value) {

    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}