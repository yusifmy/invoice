/* ═══════════════════════════════════════════════════════
   INVOICE SCRIPT  ·  script.js
   Apex Creative Studio — Interactive Invoice Form

   Features:
   - Auto-sets today's date and 30-day due date
   - Add / remove line item rows dynamically
   - Validates that Qty and Rate fields are numbers only
   - Calculates row amounts, subtotal, tax, other costs, total
   - Updates totals live on every keystroke
   - Clear All button resets the whole form
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Helpers ───────────────────────────────────────── */

  /**
   * Left-pad a number with zeros.
   * @param {number} n
   * @returns {string}
   */
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * Format a Date object as YYYY-MM-DD for <input type="date">.
   * @param {Date} d
   * @returns {string}
   */
  function formatDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /**
   * Format a number as a US dollar string.
   * @param {number} n
   * @returns {string}  e.g. "$1,234.56"
   */
  function formatCurrency(n) {
    var value = Math.abs(parseFloat(n) || 0);
    return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Escape user input for safe HTML injection.
   * @param {string} s
   * @returns {string}
   */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Return true if the string is a valid non-negative number.
   * Accepts integers and decimals. Rejects letters and symbols.
   * @param {string} val
   * @returns {boolean}
   */
  function isValidNumber(val) {
    return val.trim() !== '' && !isNaN(parseFloat(val)) && isFinite(val);
  }

  /* ── Date initialisation ───────────────────────────── */

  var today = new Date();
  document.getElementById('dateIssued').value = formatDate(today);

  var dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);
  document.getElementById('dateDue').value = formatDate(dueDate);

  /* ── Row counter ───────────────────────────────────── */

  var rowCount = 0;

  /* ── Table body reference ──────────────────────────── */

  var tbody = document.getElementById('tbody');

  /* ── Validation message reference ─────────────────── */

  var valMsg = document.getElementById('valMsg');

  /**
   * Display a validation message and clear it after 3 seconds.
   * @param {string} msg
   */
  function showValidationMsg(msg) {
    valMsg.textContent = msg;
    clearTimeout(valMsg._timer);
    valMsg._timer = setTimeout(function () {
      valMsg.textContent = '';
    }, 3000);
  }

  /* ── Grand totals calculator ───────────────────────── */

  /**
   * Read every row's qty × rate, sum them, apply tax and other costs,
   * then push results into the display spans.
   */
  function recalcTotals() {
    var subtotal = 0;

    // Loop every row and sum qty * rate
    var rows = tbody.querySelectorAll('tr');
    rows.forEach(function (tr) {
      var qtyInput  = tr.querySelector('.qty-input');
      var rateInput = tr.querySelector('.rate-input');
      if (qtyInput && rateInput) {
        var q = parseFloat(qtyInput.value)  || 0;
        var r = parseFloat(rateInput.value) || 0;
        subtotal += q * r;
      }
    });

    // Tax amount
    var taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    var tax = subtotal * (taxRate / 100);

    // Other costs
    var other = parseFloat(document.getElementById('otherCosts').value) || 0;

    // Grand total
    var total = subtotal + tax + other;

    // Update display
    document.getElementById('sub').textContent      = formatCurrency(subtotal);
    document.getElementById('taxAmt').textContent   = formatCurrency(tax);
    document.getElementById('otherAmt').textContent = formatCurrency(other);
    document.getElementById('total').textContent    = formatCurrency(total);
  }

  /* ── Add a line item row ───────────────────────────── */

  /**
   * Create and append a new line item row to the table.
   * @param {string}  desc  - item description (default empty)
   * @param {number}  qty   - quantity (default 1)
   * @param {number}  rate  - unit rate (default 0)
   * @returns {HTMLTableRowElement}
   */
  function addRow(desc, qty, rate) {
    desc = desc !== undefined ? desc : '';
    qty  = qty  !== undefined ? qty  : 1;
    rate = rate !== undefined ? rate : 0;

    var id = ++rowCount;
    var initialAmount = (parseFloat(qty) || 0) * (parseFloat(rate) || 0);

    var tr = document.createElement('tr');
    tr.dataset.rowId = id;

    tr.innerHTML =
      '<td>' +
        '<input class="tdin" placeholder="Item description\u2026"' +
               ' value="' + escapeHtml(desc) + '"' +
               ' aria-label="Item description" />' +
      '</td>' +
      '<td>' +
        '<input class="tdin r qty-input" type="number" min="0" step="1"' +
               ' value="' + qty + '" style="width:100%"' +
               ' aria-label="Quantity" />' +
      '</td>' +
      '<td>' +
        '<input class="tdin r rate-input" type="number" min="0" step="0.01"' +
               ' value="' + parseFloat(rate).toFixed(2) + '" style="width:100%"' +
               ' aria-label="Rate in dollars" />' +
      '</td>' +
      '<td class="tamt" id="amt-' + id + '">' + formatCurrency(initialAmount) + '</td>' +
      '<td style="text-align:center">' +
        '<button class="bdel" title="Remove row" aria-label="Remove this row">&times;</button>' +
      '</td>';

    // References to the inputs in this row
    var qtyInput  = tr.querySelector('.qty-input');
    var rateInput = tr.querySelector('.rate-input');
    var amtCell   = tr.querySelector('#amt-' + id);
    var delBtn    = tr.querySelector('.bdel');

    /* ── Row-level recalculation ── */
    function recalcRow() {
      var q = parseFloat(qtyInput.value)  || 0;
      var r = parseFloat(rateInput.value) || 0;
      amtCell.textContent = formatCurrency(q * r);
      recalcTotals();
    }

    /* ── Validation: numbers only in qty and rate ── */
    function validateNumberInput(input) {
      if (input.value !== '' && !isValidNumber(input.value)) {
        input.classList.add('invalid');
        showValidationMsg('Please enter numbers only in the Qty and Rate fields.');
      } else {
        input.classList.remove('invalid');
      }
    }

    qtyInput.addEventListener('input', function () {
      validateNumberInput(qtyInput);
      recalcRow();
    });

    rateInput.addEventListener('input', function () {
      validateNumberInput(rateInput);
      recalcRow();
    });

    /* ── Delete row ── */
    delBtn.addEventListener('click', function () {
      tr.remove();
      recalcTotals();
    });

    tbody.appendChild(tr);
    recalcTotals();
    return tr;
  }

  /* ── Add row button ────────────────────────────────── */

  document.getElementById('addBtn').addEventListener('click', function () {
    var newRow = addRow('', 1, 0);
    // Focus the description field of the new row
    newRow.querySelector('.tdin').focus();
  });

  /* ── Clear all button ──────────────────────────────── */

  document.getElementById('clearBtn').addEventListener('click', function () {
    // Ask user to confirm before wiping everything
    var confirmed = window.confirm(
      'Clear the entire invoice? This will remove all line items and reset all fields.'
    );

    if (!confirmed) return;

    // Clear customer fields
    document.getElementById('custName').value    = '';
    document.getElementById('custAddress').value = '';
    document.getElementById('custCity').value    = '';
    document.getElementById('custPhone').value   = '';
    document.getElementById('custEmail').value   = '';

    // Clear project fields
    document.getElementById('projDesc').value = '';
    document.getElementById('poRef').value    = '';

    // Reset invoice number
    document.getElementById('invNum').value = '0001';

    // Reset dates to today / today+30
    var t = new Date();
    document.getElementById('dateIssued').value = formatDate(t);
    var d = new Date(t);
    d.setDate(d.getDate() + 30);
    document.getElementById('dateDue').value = formatDate(d);

    // Reset selects
    document.getElementById('payMethod').selectedIndex = 0;
    document.getElementById('statusSel').selectedIndex = 0;

    // Reset totals inputs
    document.getElementById('taxRate').value    = '8';
    document.getElementById('otherCosts').value = '0';

    // Clear notes
    document.getElementById('notes').value = '';

    // Remove all rows then add one blank row
    tbody.innerHTML = '';
    rowCount = 0;
    addRow('', 1, 0);

    // Clear any validation messages
    valMsg.textContent = '';
  });

  /* ── Tax rate and other costs — live update ─────────── */

  document.getElementById('taxRate').addEventListener('input', recalcTotals);
  document.getElementById('otherCosts').addEventListener('input', recalcTotals);

  /* ── Seed with sample rows ─────────────────────────── */

  addRow('Website Design & Prototyping', 40, 85.00);
  addRow('Frontend Development',         60, 95.00);
  addRow('SEO Setup & Configuration',     1, 350.00);

})(); // end IIFE
