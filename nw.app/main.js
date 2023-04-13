(function () {
    var fs = require('fs')
    var path = require('path')
    var gui = require('nw.gui')


    // Constants
    var NWJS_ROOT = path.dirname(process.execPath);
    var APPLICATION_ROOT = path.join(NWJS_ROOT, './nw.app/apps');
    var APP_ROOT = path.join(NWJS_ROOT, 'nw.app');

    // ======================== Utils ========================
    function readApplications() {
        if (!fs.existsSync(APPLICATION_ROOT)) {
            return [];
        }

        return fs.readdirSync(APPLICATION_ROOT)
            .sort(function (a, b) {
                var time_a = fs.statSync(path.join(APPLICATION_ROOT, a)).mtimeMs;
                var time_b = fs.statSync(path.join(APPLICATION_ROOT, b)).mtimeMs;

                return time_b - time_a;
            })
            .map(function (x) {
                var date_now = new Date();
                date_now.setMonth(date_now.getMonth() - 1);

                var modified_time = fs.statSync(path.join(APPLICATION_ROOT, x)).mtimeMs;

                return {
                    newInstall: modified_time > date_now.getTime(),
                    name: x,
                    saveDir: path.join(APPLICATION_ROOT, `${x}/save`),
                    translationDir: path.join(APPLICATION_ROOT, `${x}/translations`),
                    main: `/nw.app/apps/${x}/www/index.html`
                }
            });
    }

    function createOrSymlink(source, target) {
        if (fs.existsSync(source) && fs.statSync(source).isDirectory()) {
            fs.symlinkSync(source, target, 'dir');
            return;
        }

        fs.mkdirSync(source);
        createOrSymlink(source, target);
    }

    function generateSaveSymlink(saveDir, translationDir, action) {
        createOrSymlink(saveDir, path.join(APP_ROOT, 'save'));
        createOrSymlink(translationDir, path.join(APP_ROOT, 'translations'));
        action()
    }

    function unlinkOrIgnore(symlink) {
        if (!fs.existsSync(symlink)) return;
        fs.unlinkSync(symlink);
    }

    function removeSymlink(action) {
        unlinkOrIgnore(path.join(APP_ROOT, 'save'));
        unlinkOrIgnore(path.join(APP_ROOT, 'translations'));
        action();
    }

    function elementGenerate(elementName, appId, classLists, eventHandler, text, targetAppend) {
        var el = document.createElement(elementName);
        el.setAttribute('data-app-id', appId);

        for (var e = 0; e < classLists.length; e++) {
            el.classList.add(classLists[e]);
        }

        el.onclick = eventHandler;
        el.innerText = text;
        targetAppend?.appendChild(el);
    }

    // ======================== Runtime ========================
    var applications = readApplications();

    function start() {
        var recentListingEl = document.getElementById('recent-applications-group');
        var mainListingEl = document.getElementById('applications-group');
        for (var i = 0, l = applications.length; i < l; i++) {
            var listEl = document.createElement('li');
            listEl.setAttribute('data-app-id', i);
            listEl.classList.add('list-group-item');
            listEl.onclick = function () {
                var app_id = Number(this.getAttribute('data-app-id'));
                generateSaveSymlink(applications[app_id].saveDir, applications[app_id].translationDir, function () {
                    var opts = {
                        inject_js_end: '/nw.app/hooks/rmmvutil.bundle.js'
                    }
                    gui.Window.open(applications[app_id].main, opts, function (cwin) {
                        cwin.on('close', function () {
                            removeSymlink(function () {
                                cwin.close(true);
                            });
                        });
                    });
                });
            }
            listEl.innerText = applications[i].name;

            if (applications[i].newInstall) {
                recentListingEl?.appendChild(listEl);
                continue;
            }
            mainListingEl?.appendChild(listEl);
        }
    }

    start();
})();
