document.addEventListener("DOMContentLoaded", function () {
    createSumButtons();
});

// Generate sum selection buttons (1-9)
function createSumButtons() {
    let container = document.getElementById("sumDigitsContainer");
    for (let i = 1; i <= 9; i++) {
        let btn = document.createElement("div");
        btn.id = "sumDigits" + i;
        btn.className = "sum-btn";
        btn.innerText = i;
        btn.dataset.value = i;
        btn.onclick = function () {
            btn.classList.toggle("selected");
        };
        container.appendChild(btn);
    }
}

// Function to calculate the sum of digits of a number
function sumDigits(number) {
    var sum = number.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
    while (sum >= 10) {
        sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
    }
    return sum;
}

function calculatemultiSumDigits() {
    var startNumber = parseInt(document.getElementById("multistartNumber").value);
    var maxNumber = parseInt(document.getElementById("multimaxNumber").value);

    var selectedSums = Array.from(document.querySelectorAll(".sum-btn.selected")).map(btn => parseInt(btn.dataset.value));

    if (isNaN(startNumber) || isNaN(maxNumber) || selectedSums.length === 0) {
        alert("Please enter valid numbers in all fields and select at least one sum.");
        return;
    }

    if (startNumber > maxNumber) {
        alert("Start number must be less than or equal to Max number.");
        return;
    }

    var resultDiv = document.getElementById("multirangeresult");
    resultDiv.innerHTML = ""; // Clear previous results

    var numbers = [];

    // Loop through the range and find numbers matching selected sums
    for (var number = startNumber; number <= maxNumber; number++) {
        let sum = sumDigits(number);
        if (selectedSums.includes(sum)) {
            let formattedNumber = ("0000" + number).slice(-4); // Format to 4 digits
            numbers.push({ value: formattedNumber, sum: sum });
        }
    }

    // Check if we have results
    if (numbers.length === 0) {
        resultDiv.innerHTML = "<p>No matching numbers found.</p>";
        return;
    }

    // Calculate table dimensions
    let columns = Math.min(6, Math.ceil(Math.sqrt(numbers.length))); // Max 6 columns
    let rows = Math.ceil(numbers.length / columns);

    let tableHTML = "<table class='fancy-table' style='width: 100%; border-collapse: collapse;'>";
    for (let i = 0; i < rows; i++) {
        tableHTML += "<tr>";
        for (let j = 0; j < columns; j++) {
            let index = i * columns + j;
            if (index < numbers.length) {
                let { value, sum } = numbers[index];
                let isFancy = fancy.includes(parseInt(value)); // Check if it's a "fancy" number
                tableHTML += `<td class="sum-${sum} ${isFancy ? "fancy" : ""}" style="border: 1px solid black; padding: 10px; text-align: center; font-size: 18px;">${value}</td>`;
            } else {
                tableHTML += "<td></td>"; // Empty cell
            }
        }
        tableHTML += "</tr>";
    }
    tableHTML += "</table>";

    resultDiv.innerHTML = tableHTML;
}


