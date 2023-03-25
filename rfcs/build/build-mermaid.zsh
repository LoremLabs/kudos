cd "$(dirname "$0")"

echo "Building Images from Mermaid Files..."

# Assuming rfcs are stored with 000 style prefix
for rfcDir in $(ls .. | grep -i '[0-9][0-9][0-9]'); do   
    echo "Found $rfcDir..."          
    if [ -d "../$rfcDir" ]; then
        echo "Searching for Mermaid Files in ../${rfcDir}..."
        ## Build static diagram in input folder
        for filename in ../${rfcDir}/assets/*.mmd; do
            echo "$filename found"
            [ -e "$filename" ] || continue
            outputFile="$(basename "${filename%.*}")"

            echo "Creating ../${rfcDir}/assets/${outputFile}.png"
            ./node_modules/.bin/mmdc -i "../${rfcDir}/$filename" -o "../${rfcDir}/assets/${outputFile}.png"
        done

    fi
done

