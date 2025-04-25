const API_URL = "https://67f864c12466325443ec8e1e.mockapi.io/vocabulary";
let languages = ["Vietnamese", "English"];
let vocabulary = [];
let currentTestIndex = 0;
let userAnswers = [];
let nativeLang = languages[0];
let testLanguage = languages[1];

// Hàm hiển thị thông báo
function showNotification(message, type) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = "block";
  setTimeout(() => (notification.style.display = "none"), 3000);
}

// Debounce để tối ưu kiểm tra input
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Khởi tạo khi tải trang
document.addEventListener("DOMContentLoaded", () => {
  loadLocalStorage();
  renderLanguageInputs();
  renderVocabInputs();
  loadVocab();
  document
    .getElementById("vocabulary-inputs")
    .addEventListener("input", debouncedCheckInputs);
});

// Thêm ngôn ngữ mới
function addLanguageInput() {
  if (languages.length < 4) {
    languages.push("");
    vocabulary = vocabulary.map((pair) => ({
      ...pair,
      [languages[languages.length - 1]]: "",
    }));
    renderLanguageInputs();
    renderVocabInputs();
    updateLocalStorage();
  } else {
    showNotification("Maximum 4 languages allowed.", "error");
  }
}

// Xóa ngôn ngữ
function removeLanguageInput() {
  if (languages.length > 2) {
    const removedLang = languages.pop();
    vocabulary = vocabulary.map((pair) => {
      const newPair = { ...pair };
      delete newPair[removedLang];
      return newPair;
    });
    nativeLang = languages[0];
    testLanguage = languages[1] || "";
    renderLanguageInputs();
    renderVocabInputs();
    updateLocalStorage();
  } else {
    showNotification("Minimum 2 languages required.", "error");
  }
}

// Hiển thị input ngôn ngữ và dropdown chọn ngôn ngữ kiểm tra
function renderLanguageInputs() {
  const inputsDiv = document.getElementById("language-inputs");
  inputsDiv.innerHTML = `
    <div class="language-inputs-container">
      ${languages
        .map(
          (lang, index) => `
          <input type="text" class="language-input" value="${lang}" 
                 onchange="updateLanguage(${index}, this.value)" placeholder="Language ${
            index + 1
          }">
        `
        )
        .join("")}
    </div>
    <div class="test-language-container">
      <label for="test-language-dropdown">Test Language:</label>
      <div class="custom-select-wrapper">
        <select id="test-language-dropdown" onchange="updateTestLanguage(this.value)">
          ${languages
            .slice(1)
            .map(
              (lang) =>
                `<option value="${lang}" ${
                  lang === testLanguage ? "selected" : ""
                }>${lang}</option>`
            )
            .join("")}
        </select>
        <span class="select-arrow">▼</span>
      </div>
    </div>
  `;
}

// Cập nhật ngôn ngữ
function updateLanguage(index, value) {
  languages[index] = value;
  nativeLang = languages[0];
  testLanguage = languages[1] || "";
  vocabulary = vocabulary.map((pair) => {
    const newPair = { ...pair };
    if (!newPair[languages[index]]) {
      newPair[languages[index]] = "";
    }
    return newPair;
  });
  updateLocalStorage();
  renderLanguageInputs();
  renderVocabInputs();
}

// Cập nhật ngôn ngữ kiểm tra
function updateTestLanguage(value) {
  testLanguage = value;
  updateLocalStorage();
}

// Thêm cặp từ vựng
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
  debouncedCheckInputs();
}

// Hiển thị input từ vựng
function renderVocabInputs() {
  const inputsDiv = document.getElementById("vocabulary-inputs");
  inputsDiv.innerHTML = "";
  for (let i = 0; i < Math.max(5, vocabulary.length); i++) {
    const pairDiv = document.createElement("div");
    pairDiv.innerHTML =
      languages
        .map(
          (_, j) => `
          <input type="text" placeholder="${languages[j]}" class="vocab-input vocab-${j}">
        `
        )
        .join("") +
      `<button class="delete-btn" onclick="deleteVocabPair(this)">Delete</button>`;
    inputsDiv.appendChild(pairDiv);

    if (i < vocabulary.length) {
      const inputs = pairDiv.querySelectorAll("input");
      languages.forEach((lang, j) => {
        inputs[j].value = vocabulary[i][lang] || "";
      });
    }
  }
  debouncedCheckInputs();
}

// Xóa cặp từ vựng
async function deleteVocabPair(button) {
  const pairDiv = button.parentElement;
  const index = Array.from(pairDiv.parentElement.children).indexOf(pairDiv);

  if (vocabulary.length <= 5 && index < vocabulary.length) {
    showNotification(
      "Cannot delete: Minimum 5 vocabulary pairs required.",
      "error"
    );
    return;
  }

  pairDiv.remove();

  if (index < vocabulary.length) {
    const vocabToDelete = vocabulary[index];
    vocabulary.splice(index, 1);

    try {
      if (vocabToDelete.id) {
        await fetch(`${API_URL}/${vocabToDelete.id}`, {
          method: "DELETE",
        });
      }
      updateLocalStorage();
      debouncedCheckInputs();
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      showNotification("Failed to delete vocabulary.", "error");
      renderVocabInputs();
    }
  }
}

// Chuẩn hóa tiếng Việt
function normalizeVietnamese(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Kiểm tra trùng lặp và empty
function checkInputs() {
  const inputsDiv = document.getElementById("vocabulary-inputs");
  const pairs = inputsDiv.children;
  const seen = new Set();
  let hasError = false;
  let hasEmpty = false;

  for (let pair of pairs) {
    const inputs = pair.querySelectorAll("input");
    const values = Array.from(inputs).map((input) => input.value.trim());
    inputs.forEach((input) => {
      input.style.backgroundColor = "";
      input.title = "";
    });
    pair.title = "";

    values.forEach((value, i) => {
      if (!value) {
        hasEmpty = true;
        inputs[i].style.backgroundColor = "#ffcccc";
        inputs[i].title = `Missing ${languages[i]} value`;
      }
    });

    const combined = values.join("|");
    if (seen.has(combined)) {
      hasError = true;
      inputs.forEach((input) => {
        input.style.backgroundColor = "#ffcccc";
      });
      pair.title = "Duplicate vocabulary pair";
    } else {
      seen.add(combined);
    }
  }

  document.getElementById("start-test").style.display =
    hasError || hasEmpty || pairs.length < 5 ? "none" : "block";

  return { isValid: !hasError && !hasEmpty, pairCount: pairs.length };
}

const debouncedCheckInputs = debounce(checkInputs, 300);

// Lưu từ vựng
async function saveVocab() {
  const { isValid, pairCount } = checkInputs();
  if (!isValid || pairCount < 5) {
    showNotification("Please fix errors or add at least 5 pairs.", "error");
    return;
  }

  // Thay đổi nút thành "Saving..." và vô hiệu hóa
  const saveButton = document.getElementById("save-vocab-btn");
  saveButton.textContent = "Saving...";
  saveButton.disabled = true;

  try {
    const inputsDiv = document.getElementById("vocabulary-inputs");
    const pairs = inputsDiv.children;
    const newVocabulary = Array.from(pairs).map((pair) => {
      const inputs = pair.querySelectorAll("input");
      const vocabPair = {};
      languages.forEach((lang, i) => {
        vocabPair[lang] = inputs[i].value.trim();
      });
      return vocabPair;
    });

    const currentIds = vocabulary.map((item) => item.id).filter(Boolean);
    const newWords = newVocabulary.map((item) =>
      languages.map((lang) => item[lang]).join("|")
    );

    const toDelete = vocabulary.filter(
      (item) =>
        !newWords.includes(languages.map((lang) => item[lang]).join("|"))
    );
    await Promise.all(
      toDelete.map((item) =>
        item.id
          ? fetch(`${API_URL}/${item.id}`, { method: "DELETE" })
          : Promise.resolve()
      )
    );

    const existingWords = vocabulary.map((item) =>
      languages.map((lang) => item[lang]).join("|")
    );
    const toAdd = newVocabulary.filter(
      (item) =>
        !existingWords.includes(languages.map((lang) => item[lang]).join("|"))
    );

    const addedItems = await Promise.all(
      toAdd.map((pair) =>
        fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pair),
        }).then((res) => res.json())
      )
    );

    vocabulary = newVocabulary.map((item, index) => ({
      id:
        addedItems.find((added) =>
          languages.every((lang) => added[lang] === item[lang])
        )?.id || vocabulary[index]?.id,
      ...item,
    }));

    updateLocalStorage();
    showNotification("Vocabulary saved successfully!", "success");
    document.getElementById("start-test").style.display = "block";
  } catch (error) {
    console.error("Error saving vocabulary:", error);
    showNotification("Failed to save vocabulary.", "error");
  } finally {
    // Khôi phục nút về trạng thái ban đầu
    saveButton.textContent = "Save Vocabulary";
    saveButton.disabled = false;
  }
}

// Tải từ vựng
async function loadVocab() {
  try {
    const response = await fetch(API_URL);
    let existingVocab = await response.json();

    const seen = new Set();
    const uniqueVocab = [];
    for (let item of existingVocab) {
      const hasEmptyField = languages.some((lang) => !item[lang]?.trim());
      if (hasEmptyField) continue;

      const combined = languages.map((lang) => item[lang] || "").join("|");
      if (!seen.has(combined)) {
        seen.add(combined);
        uniqueVocab.push({ id: item.id, ...item });
      }
    }

    if (uniqueVocab.length > 0) {
      vocabulary = uniqueVocab;
      updateLocalStorage();
      renderVocabInputs();
      const { isValid, pairCount } = checkInputs();
      if (pairCount >= 5 && isValid) {
        document.getElementById("start-test").style.display = "block";
      }
    }
  } catch (error) {
    console.error("Error loading vocabulary:", error);
    showNotification("Failed to load vocabulary.", "error");
  }
}

// Cập nhật localStorage
function updateLocalStorage() {
  localStorage.setItem("languages", JSON.stringify(languages));
  localStorage.setItem("vocabulary", JSON.stringify(vocabulary));
  localStorage.setItem("testLanguage", testLanguage);
}

// Tải từ localStorage
function loadLocalStorage() {
  const savedLanguages = localStorage.getItem("languages");
  if (savedLanguages) {
    languages = JSON.parse(savedLanguages);
    nativeLang = languages[0];
    testLanguage = languages[1];
  }
  const savedVocab = localStorage.getItem("vocabulary");
  if (savedVocab) {
    vocabulary = JSON.parse(savedVocab);
  }
  const savedTestLang = localStorage.getItem("testLanguage");
  if (savedTestLang) {
    testLanguage = savedTestLang;
  }
}

// Bắt đầu kiểm tra
function startTest() {
  const { isValid, pairCount } = checkInputs();
  if (pairCount < 5 || !isValid) {
    showNotification("Please save at least 5 valid vocabulary pairs.", "error");
    return;
  }
  if (!languages.includes(testLanguage) || testLanguage === nativeLang) {
    showNotification("Please select a valid test language.", "error");
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

// Hiển thị từ cần kiểm tra
function showTestWord() {
  if (currentTestIndex < vocabulary.length) {
    const word = vocabulary[currentTestIndex][nativeLang];
    document.getElementById("test-word").textContent = word;
    document.getElementById("test-input").value =
      userAnswers[currentTestIndex]?.userAnswer || "";
    updateProgress();

    const testInput = document.getElementById("test-input");
    testInput.focus();
    testInput.onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitAnswer();
      }
    };

    document.getElementById("back-button").disabled = currentTestIndex === 0;
  } else {
    showResults();
  }
}

// Gửi câu trả lời
function submitAnswer() {
  const answer = document.getElementById("test-input").value.trim();
  if (userAnswers[currentTestIndex]) {
    userAnswers[currentTestIndex].userAnswer = answer;
  } else {
    userAnswers.push({
      original: vocabulary[currentTestIndex][nativeLang],
      correct: vocabulary[currentTestIndex][testLanguage],
      userAnswer: answer,
    });
  }
  currentTestIndex++;
  showTestWord();
}

// Quay lại từ trước
function goBack() {
  if (currentTestIndex > 0) {
    const answer = document.getElementById("test-input").value.trim();
    if (userAnswers[currentTestIndex]) {
      userAnswers[currentTestIndex].userAnswer = answer;
    } else {
      userAnswers.push({
        original: vocabulary[currentTestIndex][nativeLang],
        correct: vocabulary[currentTestIndex][testLanguage],
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

// Cập nhật tiến độ
function updateProgress() {
  const progress = (currentTestIndex / vocabulary.length) * 100;
  document.getElementById("progress").style.width = `${progress}%`;
}

// Hiển thị kết quả
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
          <td class="${isCorrect ? "hit" : "miss"}">${
        isCorrect ? "✅" : "❌"
      }</td>
        </tr>
      `;
    })
    .join("");
}

// Quay lại màn hình từ vựng
function backToVocab() {
  document.getElementById("results-section").style.display = "none";
  document.getElementById("vocabulary-section").style.display = "block";
  document.getElementById("language-section").style.display = "block";
  document.getElementById("start-test").style.display =
    vocabulary.length >= 5 && checkInputs().isValid ? "block" : "none";
}
