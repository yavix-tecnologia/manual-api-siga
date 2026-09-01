source "https://rubygems.org"

# ATENÇÃO: este Gemfile é só para PRÉ-VISUALIZAR o site localmente. Quem publica
# é o GitHub Pages, com a própria toolchain dele — nada aqui participa do build
# de produção.
#
# Não usa o gem `github-pages` de propósito: ele fixa Jekyll 3.6 (2017), que não
# carrega em Ruby 3.4+. Jekyll 4 renderiza o mesmo conteúdo e os dois plugins
# abaixo são suportados pelo Pages.
gem "jekyll", "~> 4.3"
gem "jekyll-remote-theme"
gem "jekyll-seo-tag"
# Exigido pelo just-the-docs (o Pages já o inclui na lista de plugins dele).
gem "jekyll-include-cache"
gem "webrick"

# Ruby 3.4+ tirou estes dos default gems.
gem "base64"
gem "bigdecimal"
gem "csv"
gem "logger"
gem "ostruct"
