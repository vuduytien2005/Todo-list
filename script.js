// ===== 1. Lấy các phần tử HTML cần dùng =====
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const dateInput = document.getElementById("todo-date");
const list = document.getElementById("todo-list");
const count = document.getElementById("todo-count");
const filters = document.getElementById("filters");

// Tên "chìa khóa" để lưu dữ liệu trong localStorage
const STORAGE_KEY = "todos";

// ===== 2. Dữ liệu =====
// Mỗi việc là một object: { id: số, text: chuỗi, done: true/false, due: chuỗi }
// "due" là hạn chót dạng "YYYY-MM-DD" (ví dụ "2026-11-15"), hoặc "" nếu không có hạn.
let todos = loadTodos();

// Bộ lọc đang chọn: "all" (tất cả), "done" (đã xong) hoặc "active" (chưa xong).
// Không lưu vào localStorage: mỗi lần mở app sẽ quay về "Tất cả".
let currentFilter = "all";

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

function updateTodoText(id, newText) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.text = newText;
    saveTodos();
  }
  render();
}

// Bắt đầu sửa một việc: thay chữ (span) bằng một ô nhập (input).
function startEdit(span, todo) {
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "edit-input";
  editInput.value = todo.text;

  span.replaceWith(editInput); // đổi span thành input ngay tại chỗ
  editInput.focus();
  editInput.select(); // bôi đen sẵn chữ để gõ đè cho nhanh

  // Cờ "finished" để không xử lý hai lần. Ví dụ: nhấn Enter -> lưu -> render()
  // gỡ ô nhập khỏi trang -> trình duyệt có thể bắn thêm sự kiện "blur".
  let finished = false;
  function finish(save) {
    if (finished) return;
    finished = true;
    const newText = editInput.value.trim();
    if (save && newText !== "") {
      updateTodoText(todo.id, newText);
    } else {
      render(); // hủy, hoặc ô trống -> vẽ lại với nội dung cũ
    }
  }

  editInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") finish(true); // Enter: lưu
    if (event.key === "Escape") finish(false); // Esc: hủy
  });
  editInput.addEventListener("blur", () => finish(true)); // bấm ra ngoài: lưu
}

function deleteTodo(id) {
  // Giữ lại mọi việc có id khác với id cần xóa
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

// ===== Hàm phụ cho hạn chót =====
// Số ngày tính là "sắp hết hạn": còn từ 0 đến 3 ngày nữa là đến hạn.
const SOON_DAYS = 3;

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

// Tính còn bao nhiêu ngày từ hôm nay đến hạn (số âm = đã quá hạn).
function daysUntil(dueStr, todayStr) {
  const [y1, m1, d1] = dueStr.split("-").map(Number);
  const [y2, m2, d2] = todayStr.split("-").map(Number);
  const due = new Date(y1, m1 - 1, d1);
  const today = new Date(y2, m2 - 1, d2);
  const ONE_DAY = 24 * 60 * 60 * 1000; // số mili-giây trong 1 ngày
  // Math.round để tránh lệch do giờ mùa hè/mùa đông
  return Math.round((due - today) / ONE_DAY);
}

// Trả về trạng thái hạn của một việc: { label: chữ hiển thị, key: tên class CSS }
function getStatus(todo, today) {
  if (todo.done) return { label: "Đã xong", key: "done" };
  if (!todo.due) return { label: "—", key: "none" };
  const days = daysUntil(todo.due, today);
  if (days < 0) return { label: "Hết hạn", key: "overdue" };
  if (days <= SOON_DAYS) return { label: "Sắp hết hạn", key: "soon" };
  return { label: "Còn hạn", key: "ok" };
}

// Tạo một ô <td>, có thể gắn class
function makeCell(className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  return td;
}

// ===== 4. Vẽ lại giao diện từ dữ liệu =====
// Mỗi khi dữ liệu thay đổi, ta xóa bảng cũ và vẽ lại toàn bộ.
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

  // Lọc theo nút đang chọn
  const visible = sorted.filter((t) => {
    if (currentFilter === "done") return t.done;
    if (currentFilter === "active") return !t.done;
    return true; // "all": giữ tất cả
  });

  // Tô màu nút lọc đang chọn
  for (const btn of filters.querySelectorAll(".filter-btn")) {
    btn.classList.toggle("active", btn.dataset.filter === currentFilter);
  }

  // Bảng trống -> hiện một dòng thông báo trải dài cả 5 cột (colSpan = 5)
  if (visible.length === 0) {
    const tr = document.createElement("tr");
    const td = makeCell("todo-empty");
    td.colSpan = 5;
    if (todos.length === 0) td.textContent = "Chưa có việc nào. Thêm việc đầu tiên nhé!";
    else if (currentFilter === "done") td.textContent = "Chưa có việc nào xong.";
    else td.textContent = "Không còn việc nào chưa xong.";
    tr.append(td);
    list.append(tr);
  }

  for (const todo of visible) {
    const status = getStatus(todo, today);

    // Mỗi việc là một hàng <tr>. Class trạng thái (vd "status-overdue")
    // giúp CSS tô màu cả hàng.
    const tr = document.createElement("tr");
    tr.className = `todo-item status-${status.key}`;
    if (todo.done) tr.classList.add("done");

    // Cột 1: ô tick hoàn thành
    const checkCell = makeCell("col-check");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.title = "Đánh dấu đã xong";
    checkbox.addEventListener("change", () => toggleTodo(todo.id));
    checkCell.append(checkbox);

    // Cột 2: nội dung. Dùng textContent (không dùng innerHTML)
    // để chữ người dùng gõ không bị hiểu thành mã HTML.
    const textCell = makeCell("col-text");
    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;
    span.title = "Bấm đúp để sửa";
    span.addEventListener("dblclick", () => startEdit(span, todo));
    textCell.append(span);

    // Cột 3: trạng thái hạn, hiển thị dạng "nhãn" bo tròn
    const statusCell = makeCell("col-status");
    if (status.key !== "none") {
      const badge = document.createElement("span");
      badge.className = `badge badge-${status.key}`;
      badge.textContent = status.label;
      statusCell.append(badge);
    } else {
      statusCell.textContent = status.label;
    }

    // Cột 4: ngày hạn
    const dateCell = makeCell("col-date");
    dateCell.textContent = todo.due ? formatDate(todo.due) : "—";

    // Cột 5: nút xóa
    const deleteCell = makeCell("col-delete");
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Xóa việc này";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));
    deleteCell.append(deleteBtn);

    tr.append(checkCell, textCell, statusCell, dateCell, deleteCell);
    list.append(tr);
  }

  // Cập nhật dòng đếm
  const remaining = todos.filter((t) => !t.done).length;
  if (todos.length === 0) {
    count.textContent = "";
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

// ===== 6. Xử lý khi bấm nút lọc =====
// Chỉ gắn MỘT sự kiện lên khung chứa thay vì gắn cho từng nút
// (kỹ thuật "event delegation"). closest() tìm nút được bấm.
filters.addEventListener("click", (event) => {
  const btn = event.target.closest(".filter-btn");
  if (!btn) return; // bấm vào khoảng trống giữa các nút
  currentFilter = btn.dataset.filter;
  render();
});

// Vẽ giao diện lần đầu khi mở trang
render();
