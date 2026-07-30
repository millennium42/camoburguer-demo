(() => {
  const STATIC_HOST = "camoburguer-ops-web.onrender.com";
  const TARGET = "https://camoburguer-api.onrender.com/app/";

  if (window.location.hostname !== STATIC_HOST) return;

  const suffix = `${window.location.search}${window.location.hash}`;
  window.location.replace(`${TARGET}${suffix}`);
})();
