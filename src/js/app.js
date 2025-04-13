const API_URL = "https://67f864c12466325443ec8e1e.mockapi.io/vocabulary"; // Replace with your MockAPI URL

let languages = ["Vietnamese", "English"];
let vocabulary = [];
let currentTestIndex = 0;
let userAnswers = [];
let nativeLang = languages[0];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderLanguageInputs();
  renderVocabInputs();
  loadVocab();
});

// Language Management
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

// Update language
function updateLanguage(index, value) {
  languages[index] = value;
  nativeLang = languages[0];
  renderVocabInputs();
}

// Vocabulary Management
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

  // Remove from UI
  pairDiv.remove();

  // Remove from data and sync with MockAPI
  if (index < vocabulary.length) {
    const vocabToDelete = vocabulary[index];
    vocabulary.splice(index, 1);

    try {
      // Find and delete from MockAPI
      const existing = await fetch(API_URL).then((res) => res.json());
      const toDelete = existing.find(
        (item) =>
          item[languages[0]] === vocabToDelete[languages[0]] &&
          item[languages[1]] === vocabToDelete[languages[1]]
      );
      if (toDelete) {
        await fetch(`${API_URL}/${toDelete.id}`, { method: "DELETE" });
      }
      alert("Vocabulary pair deleted!");
      if (vocabulary.length < 5) {
        document.getElementById("start-test").style.display = "none";
      }
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      alert("Failed to delete vocabulary.");
      // Revert UI if API fails
      renderVocabInputs();
    }
  }
}

// Save vocabulary to MockAPI
async function saveVocab() {
  const inputsDiv = document.getElementById("vocabulary-inputs");
  const pairs = inputsDiv.children;
  if (pairs.length < 5) {
    alert("Minimum 5 vocabulary pairs required.");
    return;
  }

  vocabulary = [];
  for (let pair of pairs) {
    const inputs = pair.querySelectorAll("input");
    const vocabPair = {};
    let isEmpty = true;
    languages.forEach((lang, i) => {
      vocabPair[lang] = inputs[i].value.trim();
      if (vocabPair[lang]) isEmpty = false;
    });
    if (!isEmpty) vocabulary.push(vocabPair);
  }

  if (vocabulary.length < 5) {
    alert("Please fill at least 5 valid vocabulary pairs.");
    return;
  }

  try {
    // Clear existing data
    const existing = await fetch(API_URL).then((res) => res.json());
    for (let item of existing) {
      await fetch(`${API_URL}/${item.id}`, { method: "DELETE" });
    }

    // Save new data
    for (let pair of vocabulary) {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pair),
      });
    }
    alert("Vocabulary saved!");
    document.getElementById("start-test").style.display = "block";
  } catch (error) {
    console.error("Error saving vocabulary:", error);
    alert("Failed to save vocabulary.");
  }
}

// Load vocabulary from MockAPI
async function loadVocab() {
  try {
    const response = await fetch(API_URL);
    vocabulary = await response.json();
    renderVocabInputs();
    if (vocabulary.length >= 5) {
      document.getElementById("start-test").style.display = "block";
    }
  } catch (error) {
    console.error("Error loading vocabulary:", error);
  }
}

// Testing Mode
function startTest() {
  if (vocabulary.length < 5) {
    alert("Please save at least 5 vocabulary pairs before starting the test.");
    return;
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
    document.getElementById("test-input").value = "";
    updateProgress();
  } else {
    showResults();
  }
}

function submitAnswer() {
  const answer = document.getElementById("test-input").value.trim();
  userAnswers.push({
    original: vocabulary[currentTestIndex][nativeLang],
    correct: vocabulary[currentTestIndex][languages[1]], // Assuming second language as target
    userAnswer: answer,
  });
  currentTestIndex++;
  showTestWord();
}

function updateProgress() {
  const progress = (currentTestIndex / vocabulary.length) * 100;
  document.getElementById("progress").style.width = `${progress}%`;
}

// Results
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
