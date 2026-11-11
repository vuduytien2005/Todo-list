// ===== 1. Lấy các phần tử HTML cần dùng =====
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const dateInput = document.getElementById("todo-date");
const list = document.getElementById("todo-list");
const count = document.getElementById("todo-count");

// Tên "chìa khóa" để lưu dữ liệu trong localStorage
const STORAGE_KEY = "todos";

// ===== 2. Dữ liệu =====
// Mỗi việc là một object: { id: số, text: chuỗi, done: true/false, due: chuỗi }
// "due" là hạn chót dạng "YYYY-MM-DD" (ví dụ "2026-11-15"), hoặc "" nếu không có hạn.
let todos = loadTodos();

// Đọc danh sách từ localStorage. localStorage chỉ lưu được chuỗi,
// nên ta lưu dạng JSON và dùng JSON.parse để đổi lại thành mảng.
function loadTodos() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    // Dữ liệu bị hỏng thì bắt đầu lại từ danh sách rỗng
    return [];
  }
}

// Ghi danh sách hiện tại vào localStorage
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// ===== 3. Các thao tác =====
function addTodo(text, due) {
  todos.push({
    id: Date.now(), // dùng thời gian hiện tại làm id cho đơn giản
    text: text,
    done: false,
    due: due,
  });
  saveTodos();
  render();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.done = !todo.done; // đảo trạng thái: xong <-> chưa xong
    saveTodos();
    render();
  }
}

function deleteTodo(id) {
  // Giữ lại mọi việc có id khác với id cần xóa
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

// ===== Hàm phụ cho hạn chót =====
// Lấy ngày hôm nay dạng "YYYY-MM-DD" theo giờ máy của bạn.
// (Không dùng toISOString() vì hàm đó tính theo giờ UTC, có thể lệch 1 ngày.)
function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0"); // tháng đếm từ 0
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Đổi "2026-11-15" thành "15/11/2026" cho dễ đọc
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ===== 4. Vẽ lại giao diện từ dữ liệu =====
// Mỗi khi dữ liệu thay đổi, ta xóa danh sách cũ và vẽ lại toàn bộ.
// Cách này đơn giản và dễ hiểu, đủ nhanh cho danh sách nhỏ.
function render() {
  list.innerHTML = "";
  const today = todayString();

  // Sắp xếp để hiển thị: việc có hạn gần nhất lên đầu, việc không có hạn xuống cuối.
  // Dùng [...todos] để sắp xếp một BẢN SAO, không làm đổi thứ tự mảng gốc.
  // sort() trong JavaScript là sắp xếp "ổn định": hai việc cùng hạn
  // (hoặc cùng không có hạn) giữ nguyên thứ tự thêm vào.
  const sorted = [...todos].sort((a, b) => {
    if (a.due && !b.due) return -1; // a có hạn, b không -> a lên trước
    if (!a.due && b.due) return 1; // a không hạn, b có -> b lên trước
    if (!a.due && !b.due) return 0; // cả hai không hạn -> giữ nguyên
    return a.due.localeCompare(b.due); // cả hai có hạn -> ngày sớm hơn lên trước
  });

  for (const todo of sorted) {
    const li = document.createElement("li");
    li.className = "todo-item";
    if (todo.done) li.classList.add("done");

    // Ô tick hoàn thành
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    // Nội dung việc. Dùng textContent (không dùng innerHTML)
    // để chữ người dùng gõ không bị hiểu thành mã HTML.
    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;

    // Nút xóa
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Xóa việc này";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, span);

    // Hạn chót (chỉ hiện khi việc có hạn).
    // Chuỗi "YYYY-MM-DD" so sánh được trực tiếp: "2026-11-10" < "2026-11-11".
    if (todo.due) {
      const dueSpan = document.createElement("span");
      dueSpan.className = "todo-due";
      if (todo.due === today) {
        dueSpan.textContent = "Hôm nay";
        if (!todo.done) dueSpan.classList.add("today");
      } else {
        dueSpan.textContent = formatDate(todo.due);
        if (todo.due < today && !todo.done) {
          dueSpan.classList.add("overdue");
          dueSpan.title = "Đã quá hạn";
        }
      }
      li.append(dueSpan);
    }

    li.append(deleteBtn);
    list.append(li);
  }

  // Cập nhật dòng đếm
  const remaining = todos.filter((t) => !t.done).length;
  if (todos.length === 0) {
    count.textContent = "Chưa có việc nào. Thêm việc đầu tiên nhé!";
  } else if (remaining === 0) {
    count.textContent = "Xong hết rồi!";
  } else {
    count.textContent = `Còn ${remaining} việc chưa xong`;
  }
}

// ===== 5. Xử lý khi gửi form (bấm "Thêm" hoặc nhấn Enter) =====
form.addEventListener("submit", (event) => {
  event.preventDefault(); // chặn trình duyệt tải lại trang
  const text = input.value.trim(); // bỏ khoảng trắng thừa hai đầu
  if (text === "") return; // ô trống thì không thêm
  addTodo(text, dateInput.value); // dateInput.value là "" nếu chưa chọn ngày
  input.value = "";
  dateInput.value = "";
  input.focus();
});

// Vẽ giao diện lần đầu khi mở trang
render();
