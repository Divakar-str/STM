let allNumbers = new Set();
let filteredNumbers = [];

function updatePrintMode() {
  const select = document.getElementById("printModeSelect");
  const wrapper = document.getElementById("print-wrapper");
  
  if (select.value === "color") {
    wrapper.classList.add("print-as-color");
    select.classList.add("dropdown-multicolor");
  } else {
    wrapper.classList.remove("print-as-color");
    select.classList.remove("dropdown-multicolor");
  }
}

function generateTableFromInput() {
  const numbersInput = document.getElementById("numbersInput").value;
  const numbers = numbersInput
    .split('\n')
    .map(num => num.trim())
    .filter(num => num !== "");

  if (numbers.length === 0) {
    alert("Please paste some numbers!");
    return;
  }

  const validNumbers = numbers.filter(num => /^\d{4}$/.test(num));
  if (validNumbers.length === 0) {
    alert("No valid 4-digit numbers found!");
    return;
  }

  validNumbers.forEach(num => allNumbers.add(num));

  const uniqueNumbers = Array.from(allNumbers)
    .sort((a, b) => parseInt(a) - parseInt(b));
  
  filteredNumbers = uniqueNumbers;

  const rangeBox = document.getElementById("filteredrange-box");
  if (filteredNumbers.length > 0) {
    const start = filteredNumbers[0];
    const end = filteredNumbers[filteredNumbers.length - 1];
    document.getElementById("filteredrange").textContent = `${start} to ${end}`;
    rangeBox.classList.remove("d-none");
  } else {
    rangeBox.classList.add("d-none");
  }

  displayTable(filteredNumbers);
  displayStatistics(filteredNumbers);
  document.getElementById("numbersInput").value = "";
}

function clearFilter() {
  document
    .querySelectorAll('.filter-option input[type="checkbox"]')
    .forEach(checkbox => checkbox.checked = false);
  document
    .querySelectorAll('.number-circle')
    .forEach(circle => circle.classList.remove('selected'));
  
  filteredNumbers = Array.from(allNumbers);
  displayTable(filteredNumbers);
  displayStatistics(filteredNumbers);
}

function displayTable(numbers) {
  numbers = Array.from(numbers);
  if (numbers.length === 0) {
    document.getElementById('table-container').innerHTML = '<p class="text-muted text-center py-4 mb-0">No numbers available to display.</p>';
    return;
  }

  const columns = 10;
  let tableHTML = "<table class='custom-main-table'><tbody>";

  for (let i = 0; i < numbers.length; i += columns) {
    tableHTML += "<tr>";
    for (let j = 0; j < columns; j++) {
      const num = numbers[i + j];
      if (num !== undefined) {
        const root = parseInt(num) % 9 || 9;
        const colorClass = `color-${root}`;
        tableHTML += `<td class="cell-root-${root}">
          <div class="number-pill ${colorClass}">
            <span class="pill-dot"></span>
            <span class="pill-text">${num}</span>
            <span class="pill-dot"></span>
          </div>
        </td>`;
      } else {
        tableHTML += `<td></td>`;
      }
    }
    tableHTML += "</tr>";
  }

  tableHTML += "</tbody></table>";
  document.getElementById('table-container').innerHTML = tableHTML;
}

function displayStatistics(numbers) {
  const totalCounts = Array(10).fill(0);
  Array.from(allNumbers).forEach(num => {
    const digit = (parseInt(num) - 1) % 9 + 1;
    totalCounts[digit]++;
  });

  const selectedCounts = Array(10).fill(0);
  numbers.forEach(num => {
    const digit = (parseInt(num) - 1) % 9 + 1;
    selectedCounts[digit]++;
  });

  // Check which roots are actively selected in checkboxes
  const activeRoots = Array.from(
    document.querySelectorAll('.filter-option input:checked')
  ).map(input => input.value);

  let combinedStatisticsHTML = "";
  for (let i = 1; i <= 9; i++) {
    const isSelected = activeRoots.includes(i.toString());
    const rowClass = isSelected ? "stats-row-active" : "";

    combinedStatisticsHTML += `
      <tr class="${rowClass}" id="stats-row-${i}">
        <td class="fw-bold color-${i}">TOTAL ${i}</td>
        <td class="fw-bold">${totalCounts[i]}</td>
        <td class="fw-bold text-success">${selectedCounts[i]}</td>
      </tr>
    `;
  }

  document.getElementById('statistics').innerHTML = `
    <div class="table-responsive h-100">
      <table class="statistics-table table table-bordered table-sm align-middle text-center mb-0 h-100">
        <thead class="table-success">
          <tr>
            <th>Root</th>
            <th>Total (${allNumbers.size})</th>
            <th>Filtered (${filteredNumbers.length})</th>
          </tr>
        </thead>
        <tbody>
          ${combinedStatisticsHTML}
        </tbody>
      </table>
    </div>
  `;
}

function toggleCheckbox(event) {
  const checkbox = event.target;
  const circleDiv = checkbox
    .closest('.filter-option')
    .querySelector('.number-circle');
  circleDiv.classList.toggle('selected', checkbox.checked);
  applyFilter();
}

function applyFilter() {
  const selectedRoots = Array.from(
    document.querySelectorAll('.filter-option input:checked')
  ).map(input => input.value);

  filteredNumbers = selectedRoots.length === 0
    ? Array.from(allNumbers)
    : Array.from(allNumbers).filter(num =>
        selectedRoots.includes((parseInt(num) % 9 || 9).toString())
      );

  displayTable(filteredNumbers);
  displayStatistics(filteredNumbers);
}

function generateFilterOption(number, colorClass) {
  const filterOption = document.createElement('div');
  filterOption.classList.add('filter-option', 'text-center');

  const label = document.createElement('label');
  label.classList.add('d-flex', 'align-items-center', 'justify-content-center');

  const circleDiv = document.createElement('div');
  circleDiv.classList.add(
    colorClass,
    'rounded-circle',
    'd-flex',
    'align-items-center',
    'justify-content-center',
    'number-circle',
    'shadow-sm'
  );
  circleDiv.style.width = '36px';
  circleDiv.style.height = '36px';
  circleDiv.style.cursor = 'pointer';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = number;
  checkbox.classList.add('d-none');
  checkbox.id = `filter-${number}`;
  checkbox.addEventListener('change', toggleCheckbox);

  const numberSpan = document.createElement('span');
  numberSpan.classList.add('number-inside', 'fw-bold');
  numberSpan.textContent = number;

  circleDiv.appendChild(checkbox);
  circleDiv.appendChild(numberSpan);
  label.appendChild(circleDiv);
  filterOption.appendChild(label);

  return filterOption;
}

function populateFilterOptions() {
  const filterGroup = document.querySelector('.filter-group');
  const colorClasses = [
    'color-1','color-2','color-3',
    'color-4','color-5','color-6',
    'color-7','color-8','color-9'
  ];
  colorClasses.forEach((colorClass, index) => {
    const filterOption = generateFilterOption(index + 1, colorClass);
    filterGroup.appendChild(filterOption);
  });
}

window.onload = () => {
  populateFilterOptions();
  updatePrintMode();
};