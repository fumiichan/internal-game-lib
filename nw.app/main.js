(function () {
    const fs = require('fs')
    const path = require('path')
    const gui = require('nw.gui')

    // Constants
    const NWJS_ROOT = path.dirname(process.execPath);
    const APPLICATION_ROOT = path.join(NWJS_ROOT, './nw.app/apps')
    const APP_ROOT = path.join(NWJS_ROOT, 'nw.app')

    // ======================== Utils ========================
    console.log('NW.js Root:', NWJS_ROOT);
    console.log('Applications Root:', APPLICATION_ROOT);

    function readApplications() {
        if (!fs.existsSync(APPLICATION_ROOT)) {
            return [];
        }

        return fs.readdirSync(APPLICATION_ROOT)
            .map(x => ({
                name: x,
                saveDir: path.join(APPLICATION_ROOT, `${x}/save`),
                translationDir: path.join(APPLICATION_ROOT, `${x}/translations`),
                main: `/nw.app/apps/${x}/www/index.html`
            }))
    }

    function generateSaveSymlink(saveDir, translationDir, action) {
        fs.symlinkSync(saveDir, path.join(APP_ROOT, 'save'), 'dir');
        fs.symlinkSync(translationDir, path.join(APP_ROOT, 'translations'), 'dir');
        action()
    }

    function removeSymlink(action) {
        if (fs.existsSync(path.join(APP_ROOT, 'save'))) {
            fs.unlinkSync(path.join(APP_ROOT, 'save'))
        }

        if (fs.existsSync(path.join(APP_ROOT, 'translations'))) {
            fs.unlinkSync(path.join(APP_ROOT, 'translations'))
        }

        action();
    }

    // ======================== Runtime ========================
    const applications = readApplications()

    const mainListingEl = document.getElementById('applications-group')
    for (const app of applications) {
        const listEl = document.createElement('li')
        listEl.classList.add('list-group-item')
        listEl.onclick = function () {
            generateSaveSymlink(app.saveDir, app.translationDir, function () {
                const opts = {
                    inject_js_end: '/nw.app/hooks/rmmvutil.bundle.js'
                }
                gui.Window.open(app.main, opts, function (win) {
                    win.on('close', function () {
                        removeSymlink(function () {
                            win.close(true);
                        })
                    });
                });
            });
        }
        listEl.innerText = app.name

        mainListingEl?.appendChild(listEl)
    }
})();
