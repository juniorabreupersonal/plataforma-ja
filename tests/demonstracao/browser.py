"""Real Chromium navigation of static demos and existing server access boundaries.
No Supabase connection, accounts, .env writes, traces or session exports.
"""
from pathlib import Path
import os
import hashlib
import json
import socket
import subprocess
import time
import urllib.parse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ORIGIN = 'http://127.0.0.1:3210'
COUNT = 0


def check(value, label):
    global COUNT
    if not value:
        raise AssertionError(label)
    COUNT += 1
    print('PASS: ' + label, flush=True)


def palette_checks(page):
    page.mouse.move(0, 0)  # Measure the base state, independently from the previous click.
    result = page.get_by_role('main').evaluate("""main => {
      const frame = main.closest('[style]');
      const style = getComputedStyle(frame);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      const rgba = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle=color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
      const lum = color => rgba(color).slice(0,3).map(v => {v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
      const ratio = (a,b) => (Math.max(lum(a),lum(b))+0.05)/(Math.min(lum(a),lum(b))+0.05);
      const token = name => style.getPropertyValue('--ja-'+name).trim().toUpperCase();
      const action = main.querySelector('a');
      const actionStyle = getComputedStyle(action);
      const muted = getComputedStyle(main.querySelector('section ul p')).color;
      return {
        tokens: ['blue','purple','graphite','black','metal','white'].map(token),
        action: rgba(actionStyle.backgroundColor),
        textContrast: [ratio(actionStyle.color,actionStyle.backgroundColor),ratio(token('white'),token('graphite')),ratio(token('metal'),token('graphite')),ratio(muted,token('graphite'))],
        indicatorContrast: ratio(token('purple'),token('graphite'))
      };
    }""")
    check(result['tokens'] == ['#0B5ED7','#7B61C9','#1E1E1E','#080808','#E5E7EB','#FFFFFF'], 'paleta aprovada aplicada pelos tokens comuns')
    check(result['action'] == [11,94,215,255], f'ação principal usa Azul Performance: {result["action"]}')
    check(all(value >= 4.5 for value in result['textContrast']), 'pares de texto avaliados atendem contraste AA de 4,5:1')
    check(result['indicatorContrast'] >= 3, 'detalhe roxo tem contraste não textual de pelo menos 3:1')


def main():
    # Fail instead of reusing an unrelated running application.
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 3210))
    env = {k: v for k, v in os.environ.items() if not k.startswith(('SUPABASE_', 'NEXT_PUBLIC_SUPABASE_', 'PG')) and k not in ('DATABASE_URL', 'APP_URL')}
    env.update(APP_URL=ORIGIN, NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321',
               NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_demo_not_a_real_key', NODE_ENV='production')
    server = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3210'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            if server.poll() is not None:
                raise AssertionError('Servidor não iniciou')
            with socket.socket() as probe:
                if probe.connect_ex(('127.0.0.1', 3210)) == 0:
                    break
            time.sleep(0.1)
        else:
            raise AssertionError('Servidor não ficou disponível')
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None, args=['--no-sandbox'])
            blocked = []
            def guard(route):
                url = urllib.parse.urlsplit(route.request.url)
                if url.scheme == 'http' and url.hostname == '127.0.0.1' and url.port == 3210:
                    route.continue_()
                else:
                    blocked.append(True)
                    route.abort()
            context = browser.new_context()
            context.route('**/*', guard)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda _: errors.append(True))
            samples = [
                ('administrador', 'Administrador', 'Organizações'),
                ('profissional', 'Profissional', 'Meus alunos'),
                ('aluno', 'Aluno', 'Minha jornada'),
            ]
            for width, height in [(1440, 1000), (390, 844), (320, 740)]:
                page.set_viewport_size({'width': width, 'height': height})
                for profile, label, section in samples:
                    page.goto(ORIGIN + '/demonstracao', wait_until='networkidle')
                    page.get_by_role('link').filter(has=page.get_by_role('heading', name=label, exact=True)).click()
                    page.wait_for_url('**/demonstracao/' + profile)
                    check(page.get_by_role('note', name='Aviso de demonstração').is_visible(), f'{profile} {width}px: aviso fictício visível')
                    check(page.get_by_role('main').get_by_role('heading', level=1).count() == 1, f'{profile}: título principal único')
                    palette_checks(page)
                    nav = page.get_by_role('navigation', name='Escolher painel de demonstração')
                    check(nav.get_by_role('link', name=label, exact=True).get_attribute('aria-current') == 'page', f'{profile}: perfil de exemplo identificado')
                    section_nav = page.get_by_role('navigation', name='Navegação do painel ' + label)
                    section_nav.get_by_role('link', name=section, exact=True).click()
                    check(page.get_by_role('heading', name=section, exact=True).is_visible(), f'{profile}: navegação específica por seção')
                    # Every in-page navigation target exists, including the primary CTA.
                    for link in page.locator('a[href^="#"]').filter(visible=True).all():
                        target = link.get_attribute('href')[1:]
                        matches = page.locator('[id="' + target + '"]')
                        check(matches.count() == 1 and matches.is_visible(), f'{profile}: destino de navegação único e ativo')
                    check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'{profile} {width}px: sem rolagem horizontal')
                    check(page.get_by_role('button').count() == 0 and page.locator('form').count() == 0, f'{profile}: não há operação ou formulário simulado')
                    if width in (1440, 390) and os.environ.get('DEMO_SCREENSHOTS_DIR'):
                        dest = Path(os.environ['DEMO_SCREENSHOTS_DIR'])
                        dest.mkdir(parents=True, exist_ok=True)
                        page.screenshot(path=str(dest / f'{profile}-{width}.png'), full_page=True)
                    page.get_by_role('link', name='Voltar à apresentação dos painéis').click()
                    page.wait_for_url('**/demonstracao')
                    check(page.get_by_role('heading', level=1).is_visible(), f'{profile}: retorno à seleção')
            page.get_by_role('link', name='Revisar identidade visual', exact=True).click()
            page.wait_for_url('**/demonstracao/identidade')
            check(page.get_by_role('heading', name='Roxo Equilibrado', level=1, exact=True).is_visible(), 'exemplos visuais disponíveis para revisão')
            for color in ['#0B5ED7','#7B61C9','#1E1E1E','#080808','#E5E7EB','#FFFFFF']:
                check(page.get_by_text(color, exact=True).is_visible(), 'amostra da paleta identificada por nome e valor')
            check(page.get_by_role('heading', name='Logotipos recebidos — revisão técnica').is_visible(), 'achados de marca apresentados antes da ativação')
            for variant, width, height in [('horizontal',1448,1086),('vertical',1122,1402),('simbolo',1254,1254)]:
                logo = page.get_by_role('main').locator(f'img[src="/brand/propostas/ja-{variant}.png"]').filter(visible=True)
                logo.scroll_into_view_if_needed()
                logo.evaluate('(img) => img.decode()')
                check(logo.evaluate('(img) => img.complete && img.naturalWidth') == width and logo.evaluate('(img) => img.naturalHeight') == height, 'PNG original carregado com dimensões nativas')
                dimensions = logo.evaluate('(img) => ({w:img.getBoundingClientRect().width,h:img.getBoundingClientRect().height})')
                check(abs(dimensions['w']/dimensions['h'] - width/height) < 0.01, 'proporção original preservada sem deformação')
                check(bool(logo.get_attribute('alt')), 'proposta de marca tem texto alternativo')
                article = logo.locator('xpath=ancestor::article').first
                article.locator('summary').click()
                check(article.locator('details img').is_visible(), 'inspeção sobre fundo claro disponível sem alterar PNG')
                check(article.locator('details img').evaluate('(img) => getComputedStyle(img).filter') == 'none', 'nenhum filtro de recoloração é aplicado')
                article.locator('summary').click()
                manifest = json.loads((ROOT / 'tests/demonstracao/brand/manifest.json').read_text())
                expected = next(item for item in manifest['files'] if item['variant'] == variant)
                response = context.request.get(ORIGIN + expected['path'])
                check(response.status == 200 and 'image/png' in response.headers.get('content-type',''), 'servidor entrega PNG original no endereço indicado')
                check(hashlib.sha256(response.body()).hexdigest() == expected['sha256'], 'bytes servidos são idênticos ao PNG enviado')
            if os.environ.get('DEMO_SCREENSHOTS_DIR'):
                for summary in page.get_by_role('main').locator('summary').all():
                    summary.click()  # Capture both original compositing backgrounds for review.
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':900})
                check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'guia visual {width}px: sem overflow')
                if os.environ.get('DEMO_SCREENSHOTS_DIR'):
                    page.screenshot(path=str(Path(os.environ['DEMO_SCREENSHOTS_DIR']) / f'identidade-{width}.png'), full_page=True)
            page.goto(ORIGIN + '/demonstracao/profissional')
            page.keyboard.press('Tab')
            check(page.get_by_role('link', name='Pular para o conteúdo').evaluate('(el) => el === document.activeElement'), 'atalho de teclado para conteúdo')
            page.keyboard.press('Enter')
            check(urllib.parse.urlsplit(page.url).fragment == 'conteudo-profissional', 'atalho conduz ao conteúdo')
            # Choosing demo roles never changes browser account state.
            check(context.cookies() == [], 'demonstrações não criam cookies de sessão ou função')
            context.add_cookies([{'name': 'role', 'value': 'admin', 'url': ORIGIN}, {'name': 'ja-role', 'value': 'owner', 'url': ORIGIN}])
            for route, destination in [('/conta?role=admin&perfil=administrador', '/login'), ('/redefinir-senha?role=owner', '/recuperar-senha')]:
                page.goto(ORIGIN + route, wait_until='networkidle')
                check(urllib.parse.urlsplit(page.url).path == destination, 'rota protegida nega acesso após visita à demonstração e papel adulterado')
                check(page.get_by_text('Sua sessão foi validada.', exact=True).count() == 0, 'conteúdo autenticado não é exibido')
            for path in ['/administrador', '/profissional', '/aluno', '/demonstracao/inexistente']:
                response = page.goto(ORIGIN + path)
                check(response.status == 404, 'rota real não implementada ou demo inválida não é liberada')
            page.goto(ORIGIN + '/demonstracao/aluno?role=admin')
            check(page.get_by_role('navigation', name='Escolher painel de demonstração').get_by_role('link', name='Aluno', exact=True).get_attribute('aria-current') == 'page', 'query manipulada não muda o painel estático')
            check(not errors, 'nenhuma exceção JavaScript durante navegação')
            check(not blocked, 'nenhuma requisição do navegador para destinos externos')
            context.close()
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)
    report = f'{COUNT} browser assertions passed. Static demo only; no Auth accounts or database used.'
    print(report, flush=True)
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        print('::notice title=Demo dashboards::' + report, flush=True)


if __name__ == '__main__':
    main()
