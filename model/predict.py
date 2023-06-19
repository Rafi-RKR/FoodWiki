import torch
from torchvision import models, transforms
from PIL import Image

def pred_and_get_prediction(model, image_path, class_names=None, image_size=(224, 224), transform=None, device='cpu'):
    img = Image.open(image_path)

    if transform:
        image_transform = transform
    else:
        image_transform = transforms.Compose([
            transforms.Resize(image_size),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    model.to(device)
    model.eval()

    with torch.no_grad():
        target_image = image_transform(img).unsqueeze(0)
        target_image_pred = model(target_image.to(device))

    target_image_pred_probs = torch.softmax(target_image_pred, dim=1)
    target_image_pred_label = torch.argmax(target_image_pred_probs, dim=1)

    if class_names:
        prediction = class_names[target_image_pred_label]
    else:
        prediction = target_image_pred_label.item()

    return prediction

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--imagePath', type=str, required=True, help='Path to the input image')
    args = parser.parse_args()

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Load your model and class_names here
    model_path = 'model/sample_foodvision.pth'
    weights = models.EfficientNet_B0_Weights.DEFAULT
    auto_transforms = weights.transforms()
    model = models.efficientnet_b0(weights = weights).to(device)
    for param in model.features.parameters():
        param.requires_grad = False

        model.classifier = torch.nn.Sequential(
            torch.nn.Dropout(p = 0.2, inplace = True),
            torch.nn.Linear(in_features = 1280, out_features = 5, bias = True).to(device)
        )
    model.load_state_dict(torch.load(model_path, map_location=device))
    class_names = ['donuts', 'french_fries', 'pizza', 'steak', 'sushi']

    # Perform prediction
    prediction = pred_and_get_prediction(model, args.imagePath, class_names)

    # Print the prediction result
    print(prediction)
