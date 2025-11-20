#!/bin/bash

# Script para gerar PDFs de teste com nomes CNJ válidos
# Uso: bash gerar-pdfs-teste.sh

echo "📄 Gerando PDFs de teste..."

# Criar pasta para PDFs de teste
mkdir -p pdfs-teste

# Gerar 3 PDFs de teste usando convert (ImageMagick)
# Se não tiver ImageMagick instalado: sudo apt install imagemagick

# PDF 1: TJGO - Petição Inicial
convert -size 595x842 xc:white \
  -pointsize 20 -fill black \
  -draw "text 50,100 'PETIÇÃO INICIAL'" \
  -draw "text 50,150 'Processo: 0123456-78.2024.8.09.0051'" \
  -draw "text 50,200 'Tribunal: TJGO (8.09)'" \
  -draw "text 50,250 'Autor: João da Silva'" \
  -draw "text 50,300 'Réu: Maria dos Santos'" \
  -draw "text 50,400 'Excelentíssimo Senhor Doutor Juiz de Direito,'" \
  -draw "text 50,450 'Vem à presença de Vossa Excelência...'" \
  pdfs-teste/0123456-78.2024.8.09.0051-PETICAO.pdf

echo "  ✅ PDF 1 criado: 0123456-78.2024.8.09.0051-PETICAO.pdf"

# PDF 2: TJGO - Petição Intermediária
convert -size 595x842 xc:white \
  -pointsize 20 -fill black \
  -draw "text 50,100 'PETIÇÃO INTERMEDIÁRIA'" \
  -draw "text 50,150 'Processo: 0789012-34.2024.8.09.0001'" \
  -draw "text 50,200 'Tribunal: TJGO (8.09)'" \
  -draw "text 50,250 'Autor: Pedro Oliveira'" \
  -draw "text 50,300 'Réu: Ana Costa'" \
  -draw "text 50,400 'Excelentíssimo Senhor Doutor Juiz de Direito,'" \
  -draw "text 50,450 'Vem à presença de Vossa Excelência...'" \
  pdfs-teste/0789012-34.2024.8.09.0001-PETICAO.pdf

echo "  ✅ PDF 2 criado: 0789012-34.2024.8.09.0001-PETICAO.pdf"

# PDF 3: TJGO - Contestação
convert -size 595x842 xc:white \
  -pointsize 20 -fill black \
  -draw "text 50,100 'CONTESTAÇÃO'" \
  -draw "text 50,150 'Processo: 0456789-01.2024.8.09.0137'" \
  -draw "text 50,200 'Tribunal: TJGO (8.09)'" \
  -draw "text 50,250 'Autor: Carlos Souza'" \
  -draw "text 50,300 'Réu: Fernanda Lima'" \
  -draw "text 50,400 'Excelentíssimo Senhor Doutor Juiz de Direito,'" \
  -draw "text 50,450 'Vem à presença de Vossa Excelência...'" \
  pdfs-teste/0456789-01.2024.8.09.0137-PETICAO.pdf

echo "  ✅ PDF 3 criado: 0456789-01.2024.8.09.0137-PETICAO.pdf"

# Gerar anexos (documentos menores)
convert -size 595x842 xc:white \
  -pointsize 16 -fill black \
  -draw "text 50,100 'ANEXO 1 - Documento de Identidade'" \
  -draw "text 50,150 'RG: 12.345.678-9'" \
  pdfs-teste/0123456-78.2024.8.09.0051-ANEXO-1.pdf

echo "  ✅ Anexo 1 criado: 0123456-78.2024.8.09.0051-ANEXO-1.pdf"

convert -size 595x842 xc:white \
  -pointsize 16 -fill black \
  -draw "text 50,100 'ANEXO 2 - Comprovante de Residência'" \
  -draw "text 50,150 'Endereço: Rua das Flores, 123'" \
  pdfs-teste/0123456-78.2024.8.09.0051-ANEXO-2.pdf

echo "  ✅ Anexo 2 criado: 0123456-78.2024.8.09.0051-ANEXO-2.pdf"

echo ""
echo "✅ 5 PDFs de teste criados em pdfs-teste/"
echo ""
echo "📋 Arquivos criados:"
ls -lh pdfs-teste/
echo ""
echo "🎯 Próximo passo: Fazer upload desses PDFs no sistema!"
