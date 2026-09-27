(function () {
  const books = window.BOOKS || [];
  const site = window.SITE || {};
  const app = document.getElementById("app");
  const subjects = ["全部"];
  books.forEach(function (book) {
    if (subjects.indexOf(book.subject) < 0) subjects.push(book.subject);
  });

  const state = {
    q: "",
    subject: "全部",
    scroll: 0,
    light: -1,
  };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function pageSrc(book, page) {
    return "preview/" + book.id + "/p" + String(page).padStart(3, "0") + ".jpg";
  }

  function thumbSrc(book) {
    return "preview/" + book.id + "/thumb.jpg";
  }

  function currentId() {
    return decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  }

  function findBook(id) {
    return books.filter(function (book) { return book.id === id; })[0];
  }

  function rangeLabel(pages) {
    if (!pages.length) return "";
    const consecutive = pages.every(function (page, index) {
      return index === 0 || page === pages[index - 1] + 1;
    });
    if (pages.length === 1) return "第 " + pages[0] + " 页";
    if (consecutive) return "第 " + pages[0] + "–" + pages[pages.length - 1] + " 页";
    return pages.map(function (page) { return "第 " + page + " 页"; }).join("、");
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return books.filter(function (book) {
      if (state.subject !== "全部" && book.subject !== state.subject) return false;
      if (!q) return true;
      return (book.title + " " + book.subject + " " + book.kind + " " + book.file).toLowerCase().indexOf(q) >= 0;
    });
  }

  function badge(kind) {
    if (!kind || kind === "小大题") return "";
    return '<span class="badge">' + esc(kind) + "</span>";
  }

  function stripOf(book) {
    const pages = [];
    ["front", "mid", "back"].forEach(function (key) {
      book[key].forEach(function (page) {
        if (pages.indexOf(page) < 0) pages.push(page);
      });
    });
    return pages;
  }

  function renderIndex() {
    const list = filtered();
    const groups = [];
    list.forEach(function (book) {
      let group = groups.filter(function (item) { return item.subject === book.subject; })[0];
      if (!group) {
        group = { subject: book.subject, books: [] };
        groups.push(group);
      }
      group.books.push(book);
    });
    const chips = subjects.map(function (subject) {
      const pressed = subject === state.subject ? "true" : "false";
      return '<button class="chip" type="button" data-subject="' + esc(subject) + '" aria-pressed="' + pressed + '">' + esc(subject) + "</button>";
    }).join("");
    const body = groups.length
      ? groups.map(function (group) {
          const cards = group.books.map(function (book) {
            return (
              '<button class="card" type="button" data-id="' + esc(book.id) + '">' +
                '<img src="' + esc(thumbSrc(book)) + '" alt="' + esc(book.title) + '封面" loading="lazy">' +
                "<h3>" + esc(book.title) + "</h3>" +
                '<p class="meta">' + badge(book.kind) + esc(book.pages) + " 页</p>" +
              "</button>"
            );
          }).join("");
          return '<section class="group"><h2>' + esc(group.subject) + " <em>" + group.books.length + "</em></h2><div class=\"grid\">" + cards + "</div></section>";
        }).join("")
      : '<p class="empty">没有对上的教材。</p>';
    app.innerHTML =
      '<header class="top"><div class="wrap top-row">' +
        '<button class="brand" type="button" data-home="1"><span class="seal">题</span><span><h1>小大题样张</h1><p>开头五页 · 正中五页 · 最后五页</p></span></button>' +
        '<input class="search" type="search" placeholder="搜书名、作者" value="' + esc(state.q) + '" aria-label="搜索">' +
      "</div><div class=\"wrap filters\">" + chips + "</div></header>" +
      '<main class="wrap"><p class="count-line">共 ' + books.length + " 本，当前 " + list.length + " 本</p>" + body + "</main>" +
      '<p class="foot">样张只含每本开头、正中、结尾各最多五页。材料取自《' + esc(site.source || "教材小大题_最终版") + "》，生成于 " + esc(site.generated || "") + "。全文不放在站上。</p>";
    const input = app.querySelector(".search");
    input.addEventListener("input", function () {
      state.q = input.value;
      const pos = input.selectionStart;
      renderIndex();
      const next = app.querySelector(".search");
      next.focus();
      if (pos != null) next.setSelectionRange(pos, pos);
    });
    window.scrollTo(0, state.scroll || 0);
  }

  function renderBook(book) {
    const sections = [
      ["front", "壹", "开头"],
      ["mid", "贰", "中间"],
      ["back", "叁", "结尾"],
    ];
    const sheets = sections.map(function (item) {
      const pages = book[item[0]];
      const figs = pages.map(function (page, index) {
        const loading = index < 2 ? "eager" : "lazy";
        return (
          '<figure class="sheet"><button type="button" data-page="' + page + '">' +
            '<img src="' + esc(pageSrc(book, page)) + '" alt="' + esc(book.title) + " 第 " + page + ' 页" loading="' + loading + '">' +
          "</button><figcaption>第 " + page + " 页 / 共 " + book.pages + " 页</figcaption></figure>"
        );
      }).join("");
      return (
        '<div class="section-head"><span class="num">' + item[1] + '</span><h3>' + item[2] + "</h3><span>" + esc(rangeLabel(pages)) + "</span></div>" +
        figs
      );
    }).join("");
    app.innerHTML =
      '<header class="top"><div class="wrap top-row">' +
        '<button class="brand" type="button" data-home="1"><span class="seal">题</span><span><h1>小大题样张</h1><p>返回目录</p></span></button>' +
      "</div></header>" +
      '<article class="book"><button class="back" type="button" data-home="1">← 全部教材</button>' +
        "<h2>" + esc(book.title) + "</h2>" +
        '<p class="lead">' + badge(book.kind) + esc(book.subject) + " · 全书 " + book.pages + " 页 · 样张 " + stripOf(book).length + " 页</p>" +
        sheets +
      "</article>";
    window.scrollTo(0, 0);
  }

  function renderLight(book) {
    const pages = stripOf(book);
    if (state.light < 0 || state.light >= pages.length) return;
    const page = pages[state.light];
    const node = document.createElement("div");
    node.className = "light";
    node.innerHTML =
      "<header><span>" + esc(book.title) + "</span><button type=\"button\" data-close=\"1\">关闭</button></header>" +
      '<div class="stage"><img src="' + esc(pageSrc(book, page)) + '" alt="第 ' + page + ' 页"></div>' +
      "<footer><button type=\"button\" data-step=\"-1\">上一页</button><span>第 " + page + " 页 · " + (state.light + 1) + " / " + pages.length + "</span><button type=\"button\" data-step=\"1\">下一页</button></footer>";
    document.body.appendChild(node);
    document.body.style.overflow = "hidden";
  }

  function closeLight() {
    state.light = -1;
    const node = document.querySelector(".light");
    if (node) node.remove();
    document.body.style.overflow = "";
  }

  function render() {
    closeLight();
    const id = currentId();
    const book = id ? findBook(id) : null;
    if (book) renderBook(book);
    else renderIndex();
  }

  app.addEventListener("click", function (event) {
    const home = event.target.closest("[data-home]");
    if (home) {
      state.scroll = 0;
      location.hash = "";
      if (!location.hash) render();
      return;
    }
    const chip = event.target.closest("[data-subject]");
    if (chip) {
      state.subject = chip.getAttribute("data-subject");
      state.scroll = 0;
      renderIndex();
      return;
    }
    const card = event.target.closest("[data-id]");
    if (card) {
      state.scroll = window.scrollY;
      location.hash = "#/" + card.getAttribute("data-id");
      return;
    }
    const shot = event.target.closest("[data-page]");
    if (shot) {
      const book = findBook(currentId());
      if (!book) return;
      const page = Number(shot.getAttribute("data-page"));
      state.light = stripOf(book).indexOf(page);
      renderLight(book);
    }
  });

  document.addEventListener("click", function (event) {
    const close = event.target.closest("[data-close]");
    const step = event.target.closest("[data-step]");
    if (close) {
      closeLight();
      return;
    }
    if (!step) return;
    const book = findBook(currentId());
    if (!book) return;
    const pages = stripOf(book);
    state.light = (state.light + Number(step.getAttribute("data-step")) + pages.length) % pages.length;
    closeLight();
    renderLight(book);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeLight();
    if (!document.querySelector(".light")) return;
    const book = findBook(currentId());
    if (!book) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const pages = stripOf(book);
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      state.light = (state.light + delta + pages.length) % pages.length;
      closeLight();
      renderLight(book);
    }
  });

  window.addEventListener("hashchange", render);
  render();
})();
