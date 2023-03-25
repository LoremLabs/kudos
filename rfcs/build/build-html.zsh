startDir="$(dirname "$0")"
cd "$(dirname "$0")"

echo "Building HTML from Markdown Files..."

# Assuming rfcs are stored with 000 style prefix
for rfcDir in $(ls .. | grep -i '[0-9][0-9][0-9]'); do   
    echo "Found $rfcDir..."          
    if [ -d "../$rfcDir" ]; then
        echo "Searching for Markdown Files in ../${rfcDir}..."
        ## Build html
        for filename in ../${rfcDir}/*.md; do
            echo "$filename found"
            [ -e "$filename" ] || continue
            outputFile="$(basename "${filename%.*}")"
            echo "Searching for ../${rfcDir}/${outputFile}.md"

            if [[ -e "../${rfcDir}/config/header.md" ]]; then            
                cat ../${rfcDir}/config/header.md ../${rfcDir}/${outputFile}.md > /tmp/mdhtml.$$.md
            else
                cp ../${rfcDir}/${outputFile}.md /tmp/mdhtml.$$.md
            fi

            if [[ -e "../${rfcDir}/config/footer.md" ]]; then            
                cat ../${rfcDir}/config/footer.md >> /tmp/mdhtml.$$.md
            fi                

            ./node_modules/.bin/markdown-to-html --source /tmp/mdhtml.$$.md --output ../${rfcDir}/${outputFile}.html --no-dark-mode
            rm /tmp/mdhtml.$$.md
        done

    fi
done

