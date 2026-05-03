class TimelineSelector {
  constructor() {
    this.days = 14;

    this.track = document.getElementById("timelineTrack");
    this.labels = document.getElementById("timelineTopLabels");
    this.dotsContainer = document.getElementById("timelineDots");
    this.highlight = document.getElementById("timelineHighlight");

    this.startHandle = document.getElementById("handleStart");
    this.endHandle = document.getElementById("handleEnd");

    this.overlay = document.getElementById("timelineInteractionOverlay");

    this.rangeValue = document.getElementById("timelineRangeValue");

    this.startInput = document.getElementById("startingDate");
    this.endInput = document.getElementById("endingDate");

    this.startIndex = 0;
    this.endIndex = 13;

    this.dragging = null;

    this.dates = [];
    this.dots = [];
    this.labelNodes = [];

    this.init();
  }

  init() {
    if (!this.track || !this.labels || !this.dotsContainer) {
      return;
    }

    this.generateDates();
    this.render();
    this.attach();

    // Initial sync from existing inputs/storage
    // We use a small timeout to ensure main.js has populated the inputs from storage first
    setTimeout(() => {
      this.syncFromInputs();
    }, 100);

    // Listen for storage changes to keep timeline in sync with other controls (like Yesterday toggle)
    browser.storage.onChanged.addListener((changes) => {
      if (changes.startingDate || changes.endingDate) {
        this.syncFromInputs();
      }
    });

    // Listen for manual input changes (calendar picker or typing)
    this.startInput.addEventListener("change", () => this.syncFromInputs());
    this.endInput.addEventListener("change", () => this.syncFromInputs());
  }

  generateDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.dates = [];

    for (let i = this.days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      this.dates.push(d);
    }
  }

  getPercent(index) {
    return (index / (this.days - 1)) * 100;
  }

  render() {
    this.labels.innerHTML = "";
    this.dotsContainer.innerHTML = "";

    this.dots = [];
    this.labelNodes = [];

    this.dates.forEach((date, index) => {
      const percent = this.getPercent(index);

      const dot = document.createElement("div");
      dot.className = "timeline-dot";
      dot.style.left = `${percent}%`;
      this.dotsContainer.appendChild(dot);
      this.dots.push(dot);

      const shouldRenderLabel =
        index === 0 ||
        index === 3 ||
        index === 6 ||
        index === 9 ||
        index === 13;

      if (!shouldRenderLabel) {
        this.labelNodes.push(null);
        return;
      }

      const label = document.createElement("div");
      label.className = "timeline-date-label";
      label.style.left = `${percent}%`;

      const month = date.toLocaleString("en-US", { month: "short" });
      const day = date.getDate();

      if (index === this.days - 1) {
        label.innerHTML = `${month} ${day}<br>(Today)`;
      } else {
        label.textContent = `${month} ${day}`;
      }

      this.labels.appendChild(label);
      this.labelNodes.push(label);
    });
  }

  attach() {
    const beginDrag = (type) => {
      this.dragging = type;
      document.body.style.cursor = "grabbing";

      // If we start dragging, we should disable "Yesterday" mode if it's on
      const yesterdayRadio = document.getElementById("yesterdayContribution");
      if (yesterdayRadio && yesterdayRadio.checked) {
        yesterdayRadio.checked = false;
        // Trigger the change handler in main.js
        yesterdayRadio.dispatchEvent(new Event("change"));
      }
    };

    this.startHandle.addEventListener("mousedown", () => beginDrag("start"));
    this.endHandle.addEventListener("mousedown", () => beginDrag("end"));

    window.addEventListener("mousemove", (e) => {
      if (!this.dragging) return;

      const rect = this.track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      let index = Math.round(ratio * (this.days - 1));
      index = Math.max(0, Math.min(this.days - 1, index));

      if (this.dragging === "start") {
        this.startIndex = Math.min(index, this.endIndex);
      } else {
        this.endIndex = Math.max(index, this.startIndex);
      }

      this.update(false); // Update UI only while dragging
    });

    const endDrag = () => {
      if (!this.dragging) return;
      this.dragging = null;
      document.body.style.cursor = "";
      this.finalize(); // Finalize state and trigger report
    };

    window.addEventListener("mouseup", endDrag);

    this.overlay.addEventListener("click", (e) => {
      const rect = this.track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      let index = Math.round(ratio * (this.days - 1));
      index = Math.max(0, Math.min(this.days - 1, index));

      const startDistance = Math.abs(index - this.startIndex);
      const endDistance = Math.abs(index - this.endIndex);

      if (startDistance < endDistance) {
        this.startIndex = index;
      } else {
        this.endIndex = index;
      }

      this.update(true); // Update UI and finalize
    });

    /* =========================
           TOUCH SUPPORT
        ========================= */

    this.startHandle.addEventListener(
      "touchstart",
      (e) => {
        beginDrag("start");
      },
      { passive: true },
    );

    this.endHandle.addEventListener(
      "touchstart",
      (e) => {
        beginDrag("end");
      },
      { passive: true },
    );

    window.addEventListener(
      "touchmove",
      (e) => {
        if (!this.dragging) return;
        const touch = e.touches[0];
        const rect = this.track.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const ratio = x / rect.width;
        let index = Math.round(ratio * (this.days - 1));
        index = Math.max(0, Math.min(this.days - 1, index));

        if (this.dragging === "start") {
          this.startIndex = Math.min(index, this.endIndex);
        } else {
          this.endIndex = Math.max(index, this.startIndex);
        }

        this.update(false);
      },
      { passive: true },
    );

    window.addEventListener("touchend", endDrag);
  }

  /**
   * Update the visual state of the timeline
   * @param {boolean} finalize - If true, sync to inputs and trigger report
   */
  update(finalize = false) {
    const startPercent = this.getPercent(this.startIndex);
    const endPercent = this.getPercent(this.endIndex);

    this.highlight.style.left = `${startPercent}%`;
    this.highlight.style.width = `${endPercent - startPercent}%`;

    this.startHandle.style.left = `${startPercent}%`;
    this.endHandle.style.left = `${endPercent}%`;

    this.dots.forEach((dot, index) => {
      dot.classList.toggle(
        "active",
        index >= this.startIndex && index <= this.endIndex,
      );
    });

    this.labelNodes.forEach((label, index) => {
      if (!label) return;
      label.classList.toggle(
        "active",
        index === this.startIndex || index === this.endIndex,
      );
    });

    this.updateCard();

    if (finalize) {
      this.finalize();
    }
  }

  updateCard() {
    const start = this.dates[this.startIndex];
    const end = this.dates[this.endIndex];

    const format = (date) =>
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    const totalDays = this.endIndex - this.startIndex + 1;

    this.rangeValue.innerHTML = `
            ${format(start)}
            <span class="timeline-arrow">→</span>
            ${format(end)}
            (${totalDays} ${totalDays === 1 ? "day" : "days"})
        `;
  }

  /**
   * Sync the internal state to the original date inputs
   * and trigger the core Scrum Helper persistence logic.
   */
  finalize() {
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const newStart = formatDate(this.dates[this.startIndex]);
    const newEnd = formatDate(this.dates[this.endIndex]);

    // Only update if actually different to avoid recursive loops
    if (this.startInput.value !== newStart || this.endInput.value !== newEnd) {
      this.startInput.value = newStart;
      this.endInput.value = newEnd;

      // CALL ORIGINAL NORMALIZATION AND PERSISTENCE LOGIC
      if (
        window.scrumDateRangeUtils &&
        window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange
      ) {
        window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(
          this.startInput,
          this.endInput,
        );
      }
    }

    // TRIGGER REPORT GENERATION
    if (window.generateScrumReport) {
      const generateBtn = document.getElementById("generateReport");
      if (generateBtn) {
        const msg =
          (typeof browser !== "undefined" &&
            browser.i18n &&
            browser.i18n.getMessage("generatingButton")) ||
          "Generating...";
        generateBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${msg}`;
        generateBtn.disabled = true;
      }
      window.generateScrumReport();
    }
  }

  /**
   * Sync the timeline visual state from the current input values
   */
  syncFromInputs() {
    if (this.dragging) return; // Don't sync while the user is actively dragging

    const startVal = this.startInput.value;
    const endVal = this.endInput.value;

    if (!startVal || !endVal) return;

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const dateStrings = this.dates.map((d) => formatDate(d));

    const sIdx = dateStrings.indexOf(startVal);
    const eIdx = dateStrings.indexOf(endVal);

    if (sIdx !== -1) this.startIndex = sIdx;
    if (eIdx !== -1) this.endIndex = eIdx;

    this.update(false); // Update UI only
  }
}

// Global initialization
window.timelineSelector = new TimelineSelector();
