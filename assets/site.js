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

  function catalogHtml() {
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
    return '<p class="count-line">共 ' + books.length + " 本，当前 " + list.length + " 本</p>" + body;
  }

  function bindSearch(input) {
    let composing = false;
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () {
      composing = false;
      state.q = input.value;
      paintCatalog();
    });
    input.addEventListener("input", function () {
      if (composing) return;
      state.q = input.value;
      paintCatalog();
    });
  }

  function paintCatalog() {
    const box = app.querySelector("#catalog");
    if (!box) return;
    box.innerHTML = catalogHtml();
    app.querySelectorAll(".chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-subject") === state.subject ? "true" : "false");
    });
  }

  function renderIndex() {
    const fresh = !app.querySelector("#catalog");
    if (fresh) {
      const chips = subjects.map(function (subject) {
        const pressed = subject === state.subject ? "true" : "false";
        return '<button class="chip" type="button" data-subject="' + esc(subject) + '" aria-pressed="' + pressed + '">' + esc(subject) + "</button>";
      }).join("");
      app.innerHTML =
        '<header class="top"><div class="wrap top-row">' +
          '<button class="brand" type="button" data-home="1"><span class="seal">题</span><span><h1>小大题样张</h1><p>开头五页 · 正中五页 · 最后五页</p></span></button>' +
          '<button class="nav" type="button" data-notice="1">购买说明</button>' +
          '<input class="search" type="text" lang="zh-CN" placeholder="搜书名、作者" value="' + esc(state.q) + '" aria-label="搜索" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
        "</div><div class=\"wrap filters\">" + chips + "</div></header>" +
        '<main class="wrap" id="catalog"></main>' +
        '<p class="foot">只收录文件名以「小大题_」开头的笔记。样张只含每本开头、正中、结尾各最多五页。材料取自《' + esc(site.source || "教材小大题_最终版") + "》，生成于 " + esc(site.generated || "") + "。全文不放在站上。</p>";
      bindSearch(app.querySelector(".search"));
      window.scrollTo(0, state.scroll || 0);
    }
    paintCatalog();
  }

  function renderNotice() {
    app.innerHTML =
      '<header class="top"><div class="wrap top-row">' +
        '<button class="brand" type="button" data-home="1"><span class="seal">题</span><span><h1>小大题样张</h1><p>返回目录</p></span></button>' +
        '<button class="nav" type="button" data-notice="1">购买说明</button>' +
      "</div></header>" +
      '<article class="notice">' +
        '<button class="back" type="button" data-home="1">← 全部教材</button>' +
        "<h2>购买说明</h2>" +
        '<p class="kicker">不创作低质、烂大街的笔记，也不接受低廉的知识创作报酬。</p>' +
        "<p>同学你好：首先，非常感谢你的咨询；其次，请再阅览了解如下信息。</p>" +
        '<figure class="poster"><img src="assets/buy-guide.jpg" alt="购买方式见此图" width="2536" height="2214"></figure>' +
        '<section class="panel panel-ink">' +
          "<h3>谁在买</h3>" +
          "<p>购买资料的同学报考院校包括但不限于：广西大学、南京大学、中国农业大学、四川大学、电子科技大学、对外经济贸易大学、华南理工大学、西南财经大学、浙江财经大学、大连理工大学、郑州大学、南京工业大学、西南政法大学、中国人民大学、吉林大学、福州大学等 30 所院校。为什么同学们买了自己直系学长学姐的笔记，还会买我的笔记？</p>" +
          '<p class="spot">购买任何《小大题》系列笔记后，可加入小红书分学科考研交流群（目前共计 <b>130 人↑</b>）。</p>' +
          "<p>不定期免费分享原创笔记。</p>" +
          "<p>群内免费分享均为个人自愿整理与更新，不属于固定服务内容，也不承诺更新频率。</p>" +
        "</section>" +
        '<section class="panel panel-note">' +
          "<h3>需要注意</h3>" +
          "<p>小大题笔记主要用于凝练教材重点、梳理知识框架、规范答题表达，减少自行整理资料的时间成本；但不能代替理解、背诵和练习，也不代表专业课会因此变得轻松。</p>" +
          "<p>每个人的基础、时间和背诵速度不同，因此不承诺、也不代为规划「每天背多少页」「多久完成一轮」等个人进度。具体使用方法请先阅读笔记前言及《背诵笔记使用建议》。</p>" +
          "<p>答疑主要围绕所购笔记及使用方法展开，不包含一对一督导、每日学习安排、背诵页码规划、学习时长分配及个人复习进度设计。</p>" +
        "</section>" +
        '<section class="panel panel-price">' +
          "<h3>价格规则</h3>" +
          "<table class=\"price\"><thead><tr><th>份数</th><th>这一本</th><th>合计</th></tr></thead><tbody>" +
            "<tr><td>第一份</td><td class=\"yen\">150 元</td><td>买 1 本笔记 = <b>150 元</b></td></tr>" +
            "<tr><td>第二份</td><td class=\"yen\">120 元</td><td>买 2 本笔记 = 150＋120＝<b>270 元</b></td></tr>" +
            "<tr><td>第三份</td><td class=\"yen\">100 元</td><td>买 3 本笔记 = 150＋120＋100＝<b>370 元</b></td></tr>" +
          "</tbody></table>" +
          "<p>优惠持续有。比如第一次买了一本 150，隔一段时间又想买第二本笔记，那么第二本笔记依然是 120。</p>" +
        "</section>" +
        '<section class="panel panel-stop">' +
          "<h3>购买及使用说明</h3>" +
          "<p>资料及群二维码发送后，不接受因「内容多、难背、时间不足」等个人原因退款。</p>" +
          "<p>答疑以微信／群聊留言为主，看到就会回复，不属于实时在线「服务」。</p>" +
          "<p>笔记及群内原创资料、个人情况仅限本人学习使用或了解知情，请勿二传、拼单、倒卖或公开传播；如有侵权，将依法维权。</p>" +
        "</section>" +
        "<h3>关于 150 元</h3>" +
        '<p><span class="mark">第一，是信息差。</span>笔记本身就是我已经筛选、整理过的信息，省下的是大家自己搜集资料、辨别重点、反复试错的时间成本。</p>' +
        '<p><span class="mark">第二，是后续服务。</span>笔记相关的问题我都会尽量回复，后续有需要调整、补充的地方，也会继续处理。不能说是什么「高规格服务」，但至少我会对自己整理出来的东西负责。网上价格更高的资料很多，内容是否陈旧、是否拼凑、是否有人后续负责，同学们可以货比三家、自行判断。</p>' +
        '<p><span class="mark">第三，我自己也是这样一路过来的。</span>考研本身就会产生教材、资料、打印、课程等各种支出。哪些钱值得花、哪些没必要花，每个人都会有自己的判断。</p>' +
        "<p>150 元算不上便宜，所以我能做的，就是尽量让内容和后续都对得起这个价格。从目前收到的反馈来看，至少我确实没有辜负这份定价。</p>" +
        '<section class="panel panel-stop">' +
          "<h3>不接受的购买</h3>" +
          "<p>不接受售出给学长学姐、机构组织。目前「考研笔记 / 机构 / 辅导 / 班级」等市场鱼龙混杂，本人不参与低质内容竞争，也不接受倒卖、搬运或机构批量采购。</p>" +
          "<p>从现在起购买笔记，可能我会随机核验；我没有表示怀疑的，不会核验。（主要针对小号或水军号）</p>" +
          "<p>如果你是学长学姐或是其他什么考研机构，请拿实力做事，而不是靠窃取他人成果！</p>" +
        "</section>" +
        '<p class="close-line">认真做内容，也只把内容交给真实备考的人。</p>' +
        "<p>选择相互，理解至上。如果暂时不需要，也欢迎继续留意后续经验分享。</p>" +
        '<p class="dated">2026年9月23日星期三</p>' +
      "</article>";
    window.scrollTo(0, 0);
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
        '<button class="nav" type="button" data-notice="1">购买说明</button>' +
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
    if (id === "notice") {
      renderNotice();
      return;
    }
    const book = id ? findBook(id) : null;
    if (book) renderBook(book);
    else renderIndex();
  }

  app.addEventListener("click", function (event) {
    const home = event.target.closest("[data-home]");
    if (home) {
      state.scroll = 0;
      if (location.hash) location.hash = "";
      else render();
      return;
    }
    const notice = event.target.closest("[data-notice]");
    if (notice) {
      if (location.hash !== "#/notice") location.hash = "#/notice";
      else render();
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
