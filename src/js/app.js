const API_URL = "https://67f864c12466325443ec8e1e.mockapi.io/vocabulary";
let languages = ["Vietnamese", "English"];
let vocabulary = [];
let currentTestIndex = 0;
let userAnswers = [];
let nativeLang = languages[0];

document.addEventListener("DOMContentLoaded", () => {
  renderLanguageInputs();
  renderVocabInputs();
  loadVocab();
});

function addLanguageInput() {
  if (languages.length < 4) {
    languages.push("");
    renderLanguageInputs();
  } else {
    alert("Maximum 4 languages allowed.");
  }
}

function removeLanguageInput() {
  if (languages.length > 2) {
    languages.pop();
    renderLanguageInputs();
  } else {
    alert("Minimum 2 languages required.");
  }
}

function renderLanguageInputs() {
  const inputsDiv = document.getElementById("language-inputs");
  inputsDiv.innerHTML = languages
    .map(
      (lang, index) => `
            <input type="text" class="language-input" value="${lang}" 
                   onchange="updateLanguage(${index}, this.value)" placeholder="Language ${
        index + 1
      }">
        `
    )
    .join("");
  nativeLang = languages[0];
}

function updateLanguage(index, value) {
  languages[index] = value;
  nativeLang = languages[0];
  renderVocabInputs();
}

function addVocabPair() {
  const inputsDiv = document.getElementById("vocabulary-inputs");
  const pairDiv = document.createElement("div");
  pairDiv.innerHTML =
    languages
      .map(
        (_, i) => `
            <input type="text" placeholder="${languages[i]}" class="vocab-input vocab-${i}">
        `
      )
      .join("") +
    `<button class="delete-btn" onclick="deleteVocabPair(this)">Delete</button>`;
  inputsDiv.appendChild(pairDiv);
}

function renderVocabInputs() {
  const inputsDiv = document.getElementById("vocabulary-inputs");
  inputsDiv.innerHTML = "";
  for (let i = 0; i < Math.max(5, vocabulary.length); i++) {
    addVocabPair();
  }
  vocabulary.forEach((pair, index) => {
    const inputs = inputsDiv.children[index].querySelectorAll("input");
    languages.forEach((_, i) => {
      inputs[i].value = pair[languages[i]] || "";
    });
  });
}

async function deleteVocabPair(button) {
  const pairDiv = button.parentElement;
  const index = Array.from(pairDiv.parentElement.children).indexOf(pairDiv);

  if (vocabulary.length <= 5 && index < vocabulary.length) {
    alert("Cannot delete: Minimum 5 vocabulary pairs required.");
    return;
  }

  pairDiv.remove();

  if (index < vocabulary.length) {
    const vocabToDelete = vocabulary[index];
    vocabulary.splice(index, 1);

    try {
      const existing = await fetch(API_URL).then((res) => res.json());
      const toDelete = existing.find(
        (item) =>
          item[languages[0]] === vocabToDelete[languages[0]] &&
          item[languages[1]] === vocabToDelete[languages[1]]
      );
      if (toDelete) {
        await fetch(`${API_URL}/${toDelete.id}`, { method: "DELETE" });
      }

      if (vocabulary.length < 5) {
        document.getElementById("start-test").style.display = "none";
      }
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      alert("Failed to delete vocabulary.");
      renderVocabInputs();
    }
  }
}

function normalizeVietnamese(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function checkDuplicateInputs() {
  const inputsDiv = document.getElementById("vocabulary-inputs");
  const pairs = inputsDiv.children;
  const seen = new Set();
  let hasDuplicate = false;

  for (let pair of pairs) {
    const inputs = pair.querySelectorAll("input");
    const values = Array.from(inputs).map((input) =>
      normalizeVietnamese(input.value.trim().toLowerCase())
    );
    const combined = values.join("|");

    pair.title = "";
    inputs.forEach((input) => {
      input.style.backgroundColor = "";
    });

    if (seen.has(combined)) {
      inputs.forEach((input) => {
        input.style.backgroundColor = "#ffcccc";
      });
      pair.title = "Duplicate vocabulary pair";
      hasDuplicate = true;
    } else {
      seen.add(combined);
    }
  }

  document.getElementById("start-test").style.display =
    hasDuplicate || vocabulary.length < 5 ? "none" : "block";

  return !hasDuplicate;
}

function checkEmptyInputs() {
  const inputsDiv = document.getElementById("vocabulary-inputs");
  const pairs = inputsDiv.children;
  let hasEmpty = false;

  for (let pair of pairs) {
    const inputs = pair.querySelectorAll("input");
    let isEmptyPair = false;

    inputs.forEach((input, i) => {
      const value = input.value.trim();
      input.style.backgroundColor = "";
      input.title = "";

      if (!value) {
        isEmptyPair = true;
        input.style.backgroundColor = "#ffcccc";
        input.title = `Missing ${languages[i]} value`;
      }
    });

    if (isEmptyPair) {
      hasEmpty = true;
    }
  }

  return !hasEmpty;
}

async function saveVocab() {
  const saveButton = document.getElementById("save-button");

  if (saveButton.disabled) return;

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  if (!checkDuplicateInputs()) {
    alert("Duplicate vocabulary pairs found. Please fix them.");
    saveButton.disabled = false;
    saveButton.textContent = "Save Vocabulary";
    return;
  }

  if (!checkEmptyInputs()) {
    alert("Some vocabulary fields are empty. Please fill all fields.");
    saveButton.disabled = false;
    saveButton.textContent = "Save Vocabulary";
    return;
  }

  const inputsDiv = document.getElementById("vocabulary-inputs");
  const pairs = inputsDiv.children;

  if (pairs.length < 5) {
    alert("Minimum 5 vocabulary pairs required.");
    saveButton.disabled = false;
    saveButton.textContent = "Save Vocabulary";
    return;
  }

  const newVocabulary = [];
  for (let pair of pairs) {
    const inputs = pair.querySelectorAll("input");
    const vocabPair = {};

    languages.forEach((lang, i) => {
      const value = inputs[i].value.trim();
      vocabPair[lang] = value;
    });

    newVocabulary.push(vocabPair);
  }

  const seen = new Set();
  for (let pair of newVocabulary) {
    const combined = languages
      .map((lang) => pair[lang].toLowerCase())
      .join("|");
    if (seen.has(combined)) {
      alert("Duplicate vocabulary pair detected. Please fix before saving.");
      saveButton.disabled = false;
      saveButton.textContent = "Save Vocabulary";
      return;
    }
    seen.add(combined);
  }

  try {
    const existing = await fetch(API_URL).then((res) => res.json());
    const deletePromises = existing.map((item) =>
      fetch(`${API_URL}/${item.id}`, { method: "DELETE" })
    );
    await Promise.all(deletePromises);

    const savePromises = newVocabulary.map((pair) =>
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pair),
      })
    );
    await Promise.all(savePromises);

    vocabulary = newVocabulary;

    alert("Vocabulary saved successfully!");
    document.getElementById("start-test").style.display = "block";
  } catch (error) {
    console.error("Error saving vocabulary:", error);
    alert("Failed to save vocabulary.");
  }

  saveButton.disabled = false;
  saveButton.textContent = "Save Vocabulary";
}

async function loadVocab() {
  try {
    const response = await fetch(API_URL);
    let existingVocab = await response.json();

    const seen = new Set();
    const uniqueVocab = [];
    for (let item of existingVocab) {
      const hasEmptyField = languages.some((lang) => !item[lang]?.trim());
      if (hasEmptyField) continue;

      const combined = languages
        .map((lang) => item[lang]?.toLowerCase() || "")
        .join("|");
      if (!seen.has(combined)) {
        seen.add(combined);
        uniqueVocab.push(item);
      }
    }

    vocabulary = uniqueVocab;

    renderVocabInputs();

    checkDuplicateInputs();
    checkEmptyInputs();

    if (
      vocabulary.length >= 5 &&
      checkDuplicateInputs() &&
      checkEmptyInputs()
    ) {
      document.getElementById("start-test").style.display = "block";
    } else {
      document.getElementById("start-test").style.display = "none";
    }
  } catch (error) {
    console.error("Error loading vocabulary:", error);
    alert("Failed to load vocabulary.");
  }
}

function startTest() {
  if (vocabulary.length < 5) {
    alert("Please save at least 5 vocabulary pairs before starting the test.");
    return;
  }

  if (!checkDuplicateInputs()) {
    alert("Cannot start test. Please fix duplicate vocabulary entries.");
    return;
  }

  if (!checkEmptyInputs()) {
    alert("Cannot start test. Please fill all vocabulary fields.");
    return;
  }

  for (let pair of vocabulary) {
    const hasEmptyField = languages.some((lang) => !pair[lang]?.trim());
    if (hasEmptyField) {
      alert("Cannot start test. Some saved vocabulary fields are empty.");
      return;
    }
  }

  document.getElementById("vocabulary-section").style.display = "none";
  document.getElementById("language-section").style.display = "none";
  document.getElementById("start-test").style.display = "none";
  document.getElementById("testing-section").style.display = "block";
  currentTestIndex = 0;
  userAnswers = [];
  showTestWord();
}

function showTestWord() {
  if (currentTestIndex < vocabulary.length) {
    const word = vocabulary[currentTestIndex][nativeLang];
    document.getElementById("test-word").textContent = word;
    document.getElementById("test-input").value =
      userAnswers[currentTestIndex]?.userAnswer || "";
    updateProgress();

    const testInput = document.getElementById("test-input");
    testInput.focus();

    testInput.onkeydown = function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitAnswer();
      }
    };

    const backButton = document.getElementById("back-button");
    backButton.disabled = currentTestIndex === 0;
  } else {
    showResults();
  }
}

function submitAnswer() {
  const answer = document.getElementById("test-input").value.trim();
  if (userAnswers[currentTestIndex]) {
    userAnswers[currentTestIndex].userAnswer = answer;
  } else {
    userAnswers.push({
      original: vocabulary[currentTestIndex][nativeLang],
      correct: vocabulary[currentTestIndex][languages[1]],
      userAnswer: answer,
    });
  }
  currentTestIndex++;
  showTestWord();
}

function goBack() {
  if (currentTestIndex > 0) {
    const answer = document.getElementById("test-input").value.trim();
    if (userAnswers[currentTestIndex]) {
      userAnswers[currentTestIndex].userAnswer = answer;
    } else {
      userAnswers.push({
        original: vocabulary[currentTestIndex][nativeLang],
        correct: vocabulary[currentTestIndex][languages[1]],
        userAnswer: answer,
      });
    }
    currentTestIndex--;
    userAnswers = userAnswers.slice(0, currentTestIndex + 1);
    const word = vocabulary[currentTestIndex][nativeLang];
    document.getElementById("test-word").textContent = word;
    document.getElementById("test-input").value =
      userAnswers[currentTestIndex]?.userAnswer || "";
    updateProgress();
    document.getElementById("back-button").disabled = currentTestIndex === 0;
    document.getElementById("test-input").focus();
  }
}

function updateProgress() {
  const progress = (currentTestIndex / vocabulary.length) * 100;
  document.getElementById("progress").style.width = `${progress}%`;
}

function showResults() {
  document.getElementById("testing-section").style.display = "none";
  document.getElementById("results-section").style.display = "block";

  const correctCount = userAnswers.filter(
    (answer) => answer.userAnswer.toLowerCase() === answer.correct.toLowerCase()
  ).length;
  const hitRatio = (correctCount / vocabulary.length) * 100;
  document.getElementById(
    "hit-ratio"
  ).textContent = `Accuracy: ${hitRatio.toFixed(2)}%`;

  const tbody = document.getElementById("results-table").querySelector("tbody");
  tbody.innerHTML = userAnswers
    .map((answer) => {
      const isCorrect =
        answer.userAnswer.toLowerCase() === answer.correct.toLowerCase();
      return `
                <tr>
                    <td>${answer.original}</td>
                    <td>${answer.correct}</td>
                    <td>${answer.userAnswer}</td>
                    <td class="${isCorrect ? "hit" : "miss"}">
                        ${isCorrect ? "✅" : "❌"}
                    </td>
                </tr>
            `;
    })
    .join("");
}

function backToVocab() {
  document.getElementById("results-section").style.display = "none";
  document.getElementById("vocabulary-section").style.display = "block";
  document.getElementById("language-section").style.display = "block";
  document.getElementById("start-test").style.display =
    vocabulary.length >= 5 ? "block" : "none";
}
